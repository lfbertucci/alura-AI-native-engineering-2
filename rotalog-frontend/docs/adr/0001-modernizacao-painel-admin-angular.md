# ADR 0001 — Modernização do painel-admin (Angular 18)

- **Status:** Proposto
- **Data:** 2026-06-13
- **Contexto técnico:** rotalog-frontend (Nx 19 · Angular 18.2, app `painel-admin`)
- **Componentes afetados:** `apps/painel-admin/src/app/app.config.ts`, `app.routes.ts`, `services/frotas.service.ts`, `services/entregas.service.ts`, e os componentes `dashboard`, `entregas`, `layout` (sidebar), `manutencoes`, `motoristas`, `veiculos`
- **Referências:** [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) (seção "🖥️ rotalog-frontend"), [frotas.service.ts](../../apps/painel-admin/src/app/services/frotas.service.ts), [app.routes.ts](../../apps/painel-admin/src/app/app.routes.ts)

---

## Contexto

O `painel-admin` é um painel administrativo Angular 18 **standalone** que carrega como uma base
"legada" intencional: serviços usando `fetch()` nativo (sem `HttpClient`), sem lazy loading, sem
signals, sintaxe de template antiga (`*ngIf`/`*ngFor`), formulários template-driven e componentes
"God Object". O [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) já classifica vários
desses pontos como 🟠/🟡 na seção do frontend.

Esta ADR compara o estado atual com as boas práticas de Angular 18+ e consolida as modernizações
**ordenadas por esforço × benefício**, atendendo especificamente às duas verificações solicitadas:
**(a) as chamadas HTTP usam `HttpClient`?** e **(b) é viável aplicar lazy loading aos componentes?**
Ela é **apenas documental** — nenhuma refatoração de código foi executada e **nenhuma dependência foi
instalada** neste momento.

### Problemas identificados

#### HTTP — não usa `HttpClient` (verificação a)
- **`fetch()` nativo em vez de `HttpClient`**: ambos os serviços usam `fetch()` retornando `Promise`
  ([frotas.service.ts:32](../../apps/painel-admin/src/app/services/frotas.service.ts#L32),
  [entregas.service.ts:18](../../apps/painel-admin/src/app/services/entregas.service.ts#L18)).
- **`provideHttpClient()` ausente** no bootstrap ([app.config.ts](../../apps/painel-admin/src/app/app.config.ts)) —
  o `HttpClient` sequer está disponível na aplicação.
- **Sem interceptors** de autenticação, log, retry ou tratamento global de erro.
- **Erros engolidos** retornando `[]`/`null` em vez de propagar
  ([frotas.service.ts:39-43](../../apps/painel-admin/src/app/services/frotas.service.ts#L39-L43)).
- **Cache manual** (`veiculosCache`, `motoristasCache`) que nunca expira, com invalidação manual via
  `limparCache()` ([frotas.service.ts:16-17](../../apps/painel-admin/src/app/services/frotas.service.ts#L16-L17))
  em vez de RxJS (`shareReplay`).
- **URLs hardcoded e divergentes** (`:8080` no frotas, `:3000` no entregas) sem `environment`
  ([frotas.service.ts:8](../../apps/painel-admin/src/app/services/frotas.service.ts#L8)).

#### Roteamento — sem lazy loading, mas totalmente viável (verificação b)
- **Imports estáticos + `component:`** em [app.routes.ts](../../apps/painel-admin/src/app/app.routes.ts) —
  todos os componentes entram no bundle inicial. Como já são `standalone`, **não há módulos a
  desmembrar**: basta `loadComponent: () => import('...').then(m => m.XComponent)`.
- **Sem guards de autenticação** nem **resolvers** de pré-carregamento; rota wildcard sem página 404.
- **Navegação fora do Router**: o dashboard usa `window.location.href`
  ([dashboard.component.ts:347](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L347)) —
  provoca **reload completo, quebrando o SPA** e descartando o estado/cache.

#### Padrões de componentes desatualizados
- **Control flow antigo** (`*ngIf`/`*ngFor`/`[ngClass]` + `CommonModule`) em todos os componentes,
  em vez do `@if`/`@for`/`@switch` nativo do Angular 17+.
- **Nenhum componente com `ChangeDetectionStrategy.OnPush`**; Zone.js global
  ([app.config.ts](../../apps/painel-admin/src/app/app.config.ts) usa `provideZoneChangeDetection`).
- **Sem signals/`computed`**: estado em campos mutáveis; stats derivadas calculadas no `ngOnInit`
  ([dashboard.component.ts:319-335](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L319-L335))
  e contagem recalculada no template (`countByStatus`,
  [entregas.component.ts:196](../../apps/painel-admin/src/app/components/entregas/entregas.component.ts#L196)).
- **DI por construtor** em vez de `inject()`.
- **Cargas sequenciais** no dashboard (`getVeiculos` → `getMotoristas` → `getEntregas`) em vez de
  `Promise.all`/`forkJoin` ([dashboard.component.ts:314-316](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L314-L316)).
- **Formulários template-driven** (`[(ngModel)]`) com validação por `alert()`
  ([veiculos.component.ts:440](../../apps/painel-admin/src/app/components/veiculos/veiculos.component.ts#L440),
  [motoristas.component.ts:238](../../apps/painel-admin/src/app/components/motoristas/motoristas.component.ts#L238))
  em vez de Reactive Forms tipados + `Validators`.

#### Arquitetura / Responsabilidade (SRP)
- **God components**: `veiculos` e `motoristas` juntam lista + filtro + formulário + detalhe + CSS num
  único arquivo (~460/250 linhas) e são quase **duplicados** entre si (copy/find-replace).
- **Dashboard God Object**: stats + alertas hardcoded + tabela de "últimas entregas" duplicada com o
  componente `entregas`.
- **CSS duplicado** (`data-table`, `status-badge`, `form-grid`, `detail-panel`) repetido em vários
  componentes em vez de viver em `libs/ui-components`.
- **Diálogos nativos** `confirm()`/`alert()`; `manutencoes` chega a **expor `alert()` no template**
  ([manutencoes.component.ts:16](../../apps/painel-admin/src/app/components/manutencoes/manutencoes.component.ts#L16)).

#### Modelos / Type-safety
- **Tipos locais** em [models/index.ts](../../apps/painel-admin/src/app/models/index.ts) com snake_case,
  divergentes de `libs/shared-types` e do backend (ver seção sistêmica do MAPA); datas como `string`;
  método dead-code `getEntregasPorMotorista`
  ([entregas.service.ts:39](../../apps/painel-admin/src/app/services/entregas.service.ts#L39)).

---

## Decisão

As correções recomendadas (a serem implementadas em **trabalho posterior** — esta ADR não altera
código) estão **ordenadas por esforço × benefício**, do maior retorno para o mais custoso:

### 🟢 Quick wins (baixo esforço, alto benefício)
1. **Lazy loading das rotas** via `loadComponent` em
   [app.routes.ts](../../apps/painel-admin/src/app/app.routes.ts) — reduz o bundle inicial; viável de
   imediato pois os componentes já são `standalone`.
2. **Restaurar navegação SPA**: trocar `window.location.href` do dashboard por `routerLink`/`Router`,
   eliminando o reload completo.
3. **Paralelizar as cargas do dashboard** com `Promise.all`/`forkJoin`.
4. **Migrar o control flow** para `@if`/`@for`/`@switch` (schematic oficial
   `ng generate @angular/core:control-flow`) e remover `CommonModule`.

### 🟡 Esforço médio, alto benefício
5. **Migrar `fetch()` → `HttpClient`** com `provideHttpClient(withInterceptors(...))` no
   [app.config.ts](../../apps/painel-admin/src/app/app.config.ts).
6. **Interceptors HTTP** de autenticação e erro global (depende do item 5).
7. **`environment` + `InjectionToken` de base URL**, eliminando URLs hardcoded/divergentes.
8. **`inject()`** no lugar de DI por construtor.
9. **Mover os modelos** para `libs/shared-types`/`libs/api-contracts`, unificando os contratos.

### 🟠 Esforço médio, benefício médio
10. **Signals + `computed`** para as stats do dashboard e as contagens de entregas (remove cálculo do
    template).
11. **`ChangeDetectionStrategy.OnPush`** em todos os componentes (mais seguro após signals).
12. **Reactive Forms tipados** + `Validators` em `veiculos`/`motoristas`, substituindo `ngModel` +
    `alert()`.

### 🔴 Alto esforço — refatoração estrutural
13. **Quebrar os God components** em lista/formulário/detalhe, com **base CRUD genérica** reaproveitada
    por `veiculos` e `motoristas`.
14. **Extrair CSS/UI duplicado** (`data-table`, `status-badge`, modais) para `libs/ui-components`.
15. **Diálogo/modal reutilizável** substituindo `confirm()`/`alert()`.
16. **Avaliar zoneless change detection** (experimental no 18), apenas após `OnPush` + signals
    consolidados.

---

## Consequências

### Positivas
- **HTTP centralizado e testável**: `HttpClient` habilita interceptors (auth/erro/retry),
  `HttpTestingController` e integração com RxJS/`toSignal`.
- **Bundle inicial menor** e carregamento sob demanda via lazy loading; **navegação SPA** restaurada.
- **Menos acoplamento e duplicação**: modelos unificados em libs, UI/CSS compartilhados, componentes
  coesos com aderência ao **Single Responsibility Principle**.
- **Performance**: `OnPush` + signals reduzem ciclos de detecção; cargas paralelas reduzem o tempo de
  abertura do dashboard.
- **Forms robustos** com validação declarativa em vez de `alert()`.

### Negativas / Riscos
- A migração `fetch → HttpClient` toca os **dois serviços e todos os componentes** que hoje dão
  `await` (passam a `subscribe`/`toSignal`), alterando o fluxo assíncrono.
- **Interceptor de auth depende de um emissor de token real** — hoje os back-ends são consumidos sem
  token (ver MAPA), então o ganho é parcial até existir autenticação ponta a ponta.
- **Unificar os modelos** com `shared-types`/backend exige resolver as divergências de contrato
  (snake_case/camelCase, `StatusVeiculo.BAIXADO` inexistente) já mapeadas — **blast radius** além do
  painel-admin.
- Aumento no número de arquivos (libs de UI, componentes desmembrados, schemas de forms).

> **Nota:** boa parte desta dívida é *intencional* (codebase didática da Alura — os próprios arquivos
> trazem comentários `TODO` sinalizando cada problema). Esta ADR consolida esses marcadores, responde
> às verificações de `HttpClient` e lazy loading, e registra o caminho de modernização recomendado,
> priorizado por esforço × benefício.
