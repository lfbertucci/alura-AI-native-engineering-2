# Plano: Criar tela "Manutenção Preventiva" no painel-admin

## Context

Pedido: **verificar** três pontos no `painel-admin` (Angular 18, monorepo Nx) e agir sobre o resultado:

1. A tela de **Manutenção Preventiva** foi criada e adicionada ao sidebar?
2. O TypeScript respeita os nomes de propriedades entregues pela **api-frotas**?
3. A tela segue o padrão simples da tela de **Manutenção** (tabela + select de filtro por status, **sem** busca por texto, cards ou painel de detalhes)?

### Resultado da verificação

1. **Não existe** tela dedicada "Manutenção Preventiva". O que existe é a tela **"Alertas de Manutenção"** (`/alertas`, sidebar "Alertas 🔔"), que mostra os *alertas* gerados pelo `ManutencaoPreventivaService` — conceito diferente de uma tela com os **registros de manutenção do tipo PREVENTIVA**. Decisão do usuário: **criar uma tela nova separada**.
2. **Parcial.** A interface `AlertaManutencao` está correta (camelCase, bate com o backend). Porém a interface `Manutencao` legada em [models/index.ts](../rotalog-frontend/apps/painel-admin/src/app/models/index.ts) usa **snake_case** (`veiculo_id`, `data_agendada`, `oficina`, `km_na_manutencao`, `tipo`) que **não corresponde** ao JSON real da api-frotas (camelCase: `veiculoId`, `dataManutencao`, `quilometragemManutencao`, `tipoManutencao` etc.). A nova tela **não deve** reutilizar essa interface quebrada.
3. A tela "Manutenção" de referência ([manutencoes.component.ts](../rotalog-frontend/apps/painel-admin/src/app/components/manutencoes/manutencoes.component.ts)) é só tabela (sem filtro). A "Alertas" ([alertas.component.ts](../rotalog-frontend/apps/painel-admin/src/app/components/alertas/alertas.component.ts)) já é o padrão desejado: **tabela + select de status**, sem busca/cards/detalhes. A nova tela seguirá esse padrão.

### Contrato real da api-frotas (fonte da verdade)

`GET /api/manutencoes` → `List<Manutencao>` ([Manutencao.java](../rotalog-api-frotas/src/main/java/com/rotalog/domain/Manutencao.java), serialização Jackson padrão **camelCase**, datas ISO `yyyy-MM-dd'T'HH:mm:ss`, context-path `/api`):

| Campo JSON | Tipo | Observação |
|---|---|---|
| `id` | number | |
| `veiculoId` | number | |
| `tipoManutencao` | string | `PREVENTIVA` \| `CORRETIVA` \| `REVISAO` |
| `dataManutencao` | string (ISO) | |
| `quilometragemManutencao` | number | |
| `custo` | number | |
| `descricao` | string | |
| `status` | string | `PENDENTE` \| `EM_ANDAMENTO` \| `CONCLUIDA` \| `CANCELADA` |
| `dataCriacao` | string (ISO) | |
| `dataAtualizacao` | string (ISO) | |

Não há endpoint de filtro por `tipoManutencao` (só `/pendentes`, `/veiculo/{id}`). **Filtragem por PREVENTIVA e por status será client-side.**

---

## Implementação

Seguir o padrão dos componentes existentes: **standalone, single-file** (template + styles inline no `.ts`), import de `../../models`, fetch via `FrotasService`. Arquivos Angular em kebab-case.

### 1. Nova interface (camelCase correto) — `models/index.ts`
[apps/painel-admin/src/app/models/index.ts](../rotalog-frontend/apps/painel-admin/src/app/models/index.ts)

Adicionar (NÃO alterar a `Manutencao` legada, para não quebrar a tela `/manutencoes`):

```typescript
export interface ManutencaoPreventiva {
  id: number;
  veiculoId: number;
  tipoManutencao: string;
  dataManutencao: string;
  quilometragemManutencao: number;
  custo: number;
  descricao: string;
  status: string;
  dataCriacao: string;
  dataAtualizacao: string;
}
```

### 2. Método no service — `frotas.service.ts`
[apps/painel-admin/src/app/services/frotas.service.ts](../rotalog-frontend/apps/painel-admin/src/app/services/frotas.service.ts) (seção "MANUTENÇÕES")

Reusar o padrão `fetch` existente. Busca todas e filtra `tipoManutencao === 'PREVENTIVA'` no client:

```typescript
async getManutencoesPreventivas(): Promise<ManutencaoPreventiva[]> {
  try {
    const response = await fetch(`${API_URL}/api/manutencoes`);
    if (!response.ok) throw new Error('Erro ao buscar manutenções preventivas');
    const todas: ManutencaoPreventiva[] = await response.json();
    return todas.filter(m => m.tipoManutencao === 'PREVENTIVA');
  } catch (error) {
    console.error('Erro:', error);
    return [];
  }
}
```
(adicionar `ManutencaoPreventiva` ao import de `../models`)

### 3. Novo componente
`apps/painel-admin/src/app/components/manutencao-preventiva/manutencao-preventiva.component.ts`

- Selector `app-manutencao-preventiva`, standalone, `imports: [CommonModule, FormsModule]`.
- Título `<h1>Manutenção Preventiva</h1>`.
- **Select de filtro por status** (espelha o de Alertas): `Todos / PENDENTE / EM_ANDAMENTO / CONCLUIDA / CANCELADA`.
- **Tabela** (`class="data-table"`, mesmos estilos da tela Manutenção) com colunas: ID, Veículo ID, Descrição, Data (`dataManutencao`), KM (`quilometragemManutencao`), Custo (`custo | number:'1.2-2'`), Status (status-badge).
- **Sem** busca por texto, **sem** cards, **sem** painel de detalhes.
- Carrega tudo em `ngOnInit` via `getManutencoesPreventivas()`, guarda a lista completa e aplica o filtro de status **em memória** (getter `manutencoesFiltradas` ou recálculo em `onFiltroChange()`), evitando refetch.
- Reaproveitar as classes de status-badge `status-PENDENTE/EM_ANDAMENTO/CONCLUIDA/CANCELADA` (mesmas cores da tela Manutenção) nos styles inline.

### 4. Rota — `app.routes.ts`
[apps/painel-admin/src/app/app.routes.ts](../rotalog-frontend/apps/painel-admin/src/app/app.routes.ts)

Importar o componente e adicionar:
```typescript
{ path: 'manutencao-preventiva', component: ManutencaoPreventivaComponent },
```

### 5. Sidebar — `sidebar.component.ts`
[apps/painel-admin/src/app/components/layout/sidebar.component.ts](../rotalog-frontend/apps/painel-admin/src/app/components/layout/sidebar.component.ts)

Adicionar item de menu logo após "Manutenções":
```html
<li>
  <a routerLink="/manutencao-preventiva" routerLinkActive="active">
    <span class="icon">🛡️</span>
    <span>Manutenção Preventiva</span>
  </a>
</li>
```

---

## Verificação (como testar end-to-end)

1. **Build/lint** via Nx (prefixar com o package manager do workspace):
   `npm exec nx lint painel-admin` e `npm exec nx build painel-admin` — devem passar sem erros de TS (valida que as propriedades camelCase compilam).
2. **App de pé**: subir banco + seed (`docker-compose` do rotalog-workspace, schema `frotas`), rodar a api-frotas (`:8080`, context `/api`) e `npm exec nx serve painel-admin`.
3. No navegador:
   - Confirmar o item **"Manutenção Preventiva 🛡️"** no sidebar e que `/manutencao-preventiva` carrega.
   - Confirmar que a **tabela** lista apenas registros `PREVENTIVA`, com Data/KM/Custo/Status preenchidos (sem `undefined` — prova de que os nomes camelCase batem com a api-frotas).
   - Confirmar que o **select de status** filtra a tabela e que **não há** busca por texto, cards nem painel de detalhes.
4. Conferir no Network que a chamada é `GET http://localhost:8080/api/manutencoes` e que o JSON vem em camelCase.

## Não incluído

- Corrigir a interface `Manutencao` legada (snake_case) e a tela `/manutencoes` — drift pré-existente, fora do escopo deste pedido.
- Renomear/remover a tela "Alertas".
- Mover tipos para `libs/shared-types` (os componentes atuais usam `app/models` local; mantemos a consistência).
