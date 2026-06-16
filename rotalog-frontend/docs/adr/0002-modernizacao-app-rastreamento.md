# ADR 0002 — Modernização do app `rastreamento` (React)

- **Status:** Proposto
- **Data:** 2026-06-13
- **Contexto técnico:** rotalog-frontend (Nx 19) · app `rastreamento` (React 18.3)
- **Componentes afetados:** `apps/rastreamento/src/App.tsx`, `apps/rastreamento/src/components/TrackingDashboard.tsx`, `apps/rastreamento/src/components/DeliveryList.tsx`, `apps/rastreamento/src/components/MapView.tsx`, `apps/rastreamento/tsconfig.app.json`, `libs/shared-types/src/index.ts`, `package.json`
- **Referências:** [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) (seção "🖥️ rotalog-frontend"), [App.tsx](../../apps/rastreamento/src/App.tsx), [MapView.tsx](../../apps/rastreamento/src/components/MapView.tsx)

---

## Contexto

O app `rastreamento` é o portal público de acompanhamento de entregas em tempo real,
escrito em **React 18.3** dentro do monorepo Nx. Embora já use `createRoot` + `StrictMode`
([main.tsx:10-18](../../apps/rastreamento/src/main.tsx#L10-L18)), o app acumula dívida técnica
**intencional** (codebase didática da Alura): os quatro componentes são **class components**,
tipagem é toda `any`, `PropTypes` convivem com TypeScript, e o mapa usa Leaflet via CDN apesar
de `react-leaflet` já estar instalado. O [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md)
já classifica boa parte desses pontos como 🟠/🟡 na seção do frontend.

Esta ADR consolida os problemas **atuais e potenciais** de **modernização, type-safety e
manutenibilidade** do app `rastreamento` e registra as decisões de correção, priorizadas por
**esforço × benefício**. Ela é **apenas documental** — nenhuma refatoração de código foi
executada e **nenhuma dependência foi instalada ou atualizada** neste momento.

### Problemas identificados

#### Versionamento / React 18 → 19
- **React/ReactDOM `~18.3.1`** ([package.json:51-52](../../package.json#L51-L52)) é o topo da linha 18.x;
  o React 19 já é estável. O upgrade é **tecnicamente barato** para este app, mas tem armadilhas:
  - **PropTypes deixam de ser validados** no React 19 (o processamento de `propTypes`/`defaultProps`
    foi removido). As validações existentes viram **código morto silencioso** — atualizar sem antes
    migrar para tipos TS faz o app **perder validação sem aviso**.
  - **Novo JSX transform** e `@types/react@19` mais estritos (ex.: `children` não implícito). Como o
    app é todo `any`, o impacto de tipos **no app** é mínimo, mas as **libs tipadas**
    (`shared-types`, `ui-components`) podem exigir ajustes.
  - Ecossistema: `react-leaflet@4` pede React 18 e `react-leaflet@5` pede React 19. Como o mapa usa
    Leaflet **vanilla via CDN**, não é bloqueante hoje — mas acopla os dois trabalhos.
  - Class components **não foram removidos** no 19 → o upgrade **não obriga** a migração para hooks.

#### Arquitetura / Componentização (class vs. functional + hooks)
- **4/4 componentes são class components** com lógica de negócio e fetch embutidos:
  [App.tsx:9](../../apps/rastreamento/src/App.tsx#L9), [TrackingDashboard.tsx:28](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L28),
  [DeliveryList.tsx:13](../../apps/rastreamento/src/components/DeliveryList.tsx#L13), [MapView.tsx:10](../../apps/rastreamento/src/components/MapView.tsx#L10).
- **`fetch` direto no componente**, sem camada de API: em `App.fetchDeliveries`
  ([App.tsx:40](../../apps/rastreamento/src/App.tsx#L40)) e no polling do dashboard
  ([TrackingDashboard.tsx:56](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L56)). Há menção a
  "Redux sem Toolkit" que **nunca foi implementada** ([App.tsx:24-25](../../apps/rastreamento/src/App.tsx#L24-L25)).
- **Antipattern de derived state** no `DeliveryList`: `filteredDeliveries`/`sortBy` vivem no `state`
  inicializados a partir de props ([DeliveryList.tsx:16-19](../../apps/rastreamento/src/components/DeliveryList.tsx#L16-L19))
  e só são recalculados em `componentDidUpdate` ([DeliveryList.tsx:22-26](../../apps/rastreamento/src/components/DeliveryList.tsx#L22-L26)) —
  risco de estado obsoleto; deveria ser derivação por `useMemo`.
- **Polling por componente** com `setInterval(5s)` ([TrackingDashboard.tsx:40-44](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L40-L44)),
  cujo resultado **não é usado** (apenas atualiza `lastUpdate`); sem cancelamento centralizado.
- **Ciclo de vida do mapa** espalhado em `componentDidMount`/`componentDidUpdate`/`componentWillUnmount`
  ([MapView.tsx:28-43](../../apps/rastreamento/src/components/MapView.tsx#L28-L43)) — candidato natural a custom hook.

#### Type-safety (PropTypes vs. TypeScript)
- **Pior dos dois mundos**: arquivos são `.tsx`, mas tudo é `React.Component<any, any>` e props `any`
  → o TypeScript **não oferece nenhuma segurança em build**.
- **PropTypes frouxos e redundantes** em todos os componentes (`PropTypes.object`/`array`, sem `shape`);
  `App.propTypes` está **vazio** ([App.tsx:126-128](../../apps/rastreamento/src/App.tsx#L126-L128)).
  PropTypes validam **só em dev/runtime, nunca em build nem produção** e somem no React 19.
- **`strict: false` / `noImplicitAny: false`** ([tsconfig.app.json:6-11](../../apps/rastreamento/tsconfig.app.json#L6-L11))
  desligam justamente as checagens que pegariam esses erros.
- **Mismatch de contrato não detectado**: o app consome `delivery.destino_lat`/`origem_lat`/`motorista_nome`
  (snake_case PT — [App.tsx:61-62](../../apps/rastreamento/src/App.tsx#L61-L62)), enquanto
  `libs/shared-types` define `destination_lat`/`origin_lat`/`driver_name` (snake_case EN —
  [shared-types/index.ts:31-48](../../libs/shared-types/src/index.ts#L31-L48)). Sem tipos reais, esse
  divórcio entre interface e uso passa despercebido. Correlaciona com a dívida sistêmica de
  **contratos divergentes** do MAPA.
- **Dependência extra `prop-types`** ([package.json:53](../../package.json#L53)) mantida sem ganho real.

#### Duplicação / Reúso
- **`STATUS_CONFIG` duplicado** entre [TrackingDashboard.tsx:6-12](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L6-L12)
  e [DeliveryList.tsx:5-11](../../apps/rastreamento/src/components/DeliveryList.tsx#L5-L11), com `FIXME` explícito
  pedindo lib compartilhada — enquanto `libs/ui-components` já expõe um `StatusBadge`.

#### Mapa / Dependências
- **Leaflet carregado via `<script>` CDN** com `declare const L: any`
  ([MapView.tsx:8](../../apps/rastreamento/src/components/MapView.tsx#L8), [MapView.tsx:52-63](../../apps/rastreamento/src/components/MapView.tsx#L52-L63)),
  embora `leaflet`, `react-leaflet` e `@types/leaflet` já estejam no `package.json`
  ([package.json:75-76](../../package.json#L75-L76), [package.json:40](../../package.json#L40)). Isso adiciona
  **dependência de rede em runtime**, risco de `integrity`/CDN e **tipagem fraca** (`L: any`).

---

## Decisão

As correções recomendadas (a serem implementadas em **trabalho posterior** — esta ADR não altera
código), **ordenadas por esforço × benefício**:

| # | Modernização | Esforço | Benefício | Notas |
|---|--------------|---------|-----------|-------|
| 1 | Tipar props com interfaces (de `shared-types`) + **remover PropTypes** + ligar `strict` gradual | Baixo-Médio | **Alto** | Pega bugs em build (ex.: `destino_lat`); pré-requisito do upgrade do React 19 |
| 2 | Deduplicar `STATUS_CONFIG` → usar `ui-components/StatusBadge` (ou config única em lib) | Baixo | Médio | Remove duplicação entre `TrackingDashboard` e `DeliveryList` |
| 3 | Migrar class → functional + hooks (`usePolling`, `useDeliveries`, `useMemo`) | Médio-Alto | **Alto** | Corrige o derived-state do `DeliveryList`; destrava recursos do React 19 |
| 4 | Trocar Leaflet via CDN por `react-leaflet` (já instalado) | Médio | Médio-Alto | Remove dependência de CDN/integrity e o `L: any`; mais simples após o item 3 |
| 5 | Upgrade React 18 → 19 (`nx migrate` + codemods) | Médio | Médio | Fazer **depois** de 1 e 3 para não perder validação ao remover PropTypes |
| 6 | Data-fetching: Redux Toolkit ou React Query (substitui `fetch` solto + polling manual) | Alto | Médio-Alto | Maior escopo; centraliza cache e cancelamento de polling |

**Sequência recomendada:** 1 → 2 → 3 → 4 → 5 → 6 (quick wins de tipagem primeiro; upgrade do React
por último, já sem PropTypes a perder).

Em adição, **corrigir o mismatch de contrato** (snake_case PT vs. EN) ao tipar — alinhando
`shared-types` à forma realmente retornada pela API de entregas, em coordenação com a dívida
sistêmica de contratos divergentes do MAPA.

---

## Consequências

### Positivas
- **Type-safety real**: erros de campo (ex.: `destino_lat` vs `destination_lat`) pegos em **build**,
  não em runtime; autocomplete e refactors seguros.
- **Componentes menores e testáveis**: lógica reutilizável extraída para custom hooks; fim do
  boilerplate de `constructor`/`this`/bind e do antipattern de derived state.
- **Menos duplicação** (config de status única) e **menos dependências de runtime** (fim do Leaflet
  via CDN e da lib `prop-types`).
- **Caminho de upgrade para React 19 seguro**, sem perda silenciosa de validação.
- Aderência às convenções do workspace (tipos/UI compartilhados nas libs, não duplicados nos apps).

### Negativas / Riscos
- **Ligar `strict`** vai expor muitos `any` de uma vez — exige adoção **incremental** (por arquivo)
  para não travar o build.
- **Migração para `react-leaflet`** muda a forma de renderizar markers/rotas; o código atual de
  `updateMapMarkers` (popups HTML, `fitBounds`, rota tracejada) precisará ser reescrito de forma
  declarativa, com risco de regressão visual.
- **Alinhar o contrato** de `shared-types` pode quebrar outros consumidores (o `painel-admin` também
  importa de `shared-types`) — exige verificar `nx affected`.
- O **upgrade do React 19** demanda `nx migrate`, atualização de `@types/react`/`@types/react-dom` e
  possível bump de `react-leaflet` para v5; revalidar sob StrictMode (double-invoke).
- Aumento no número de arquivos (hooks, lib de status) no módulo.

> **Verificação (no trabalho de implementação):** build/lint sempre via Nx
> (`npm exec nx build rastreamento`, `npm exec nx lint rastreamento`), validação manual com
> `npm exec nx serve rastreamento` (porta 3001) e `npm exec nx affected -t build lint test` após cada
> etapa para garantir que as libs (`shared-types`, `ui-components`) e o `painel-admin` seguem compilando.

> **Nota:** boa parte desta dívida é *intencional* (codebase didática da Alura — os próprios arquivos
> trazem comentários `TODO`/`FIXME` sinalizando cada problema). Esta ADR consolida esses marcadores,
> adiciona os problemas estruturais (derived state, mismatch de contrato, CDN de Leaflet) e registra o
> caminho de correção recomendado, priorizado por esforço × benefício.
