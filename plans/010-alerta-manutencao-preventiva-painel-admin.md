# Plano 010: Alerta de Manutenção Preventiva — painel-admin

> Parte 3 de 3 do recurso "Alerta de manutenção preventiva" (ver `DoD.md`).
> Planos relacionados: `008-...-rotalog-api-frotas`, `009-...-rotalog-api-notificacoes`.

## Contexto

O painel admin (Angular 18, dentro do monorepo Nx `rotalog-frontend`) hoje exibe alertas
**hardcoded** no dashboard ([dashboard.component.ts:290-295](../rotalog-frontend/apps/painel-admin/src/app/components/dashboard/dashboard.component.ts)).
Pelo `DoD.md`, é preciso uma **tela que lista os alertas com filtro por status**, consumindo os alertas
reais expostos pela api-frotas (plano 008): `GET http://localhost:8080/api/alertas-manutencao?status=`,
que retorna `{ id, veiculoId, placa, modelo, quilometragemAlerta, motivo, dataAlerta, statusNotificacao }`.
O DoD também pede o **teste E2E do fluxo completo**.

## Mudanças

### 1. Modelo
Adicionar interface `AlertaManutencao` em [models/index.ts](../rotalog-frontend/apps/painel-admin/src/app/models/index.ts):
`{ id, veiculoId, placa, modelo, quilometragemAlerta, motivo, dataAlerta, statusNotificacao }`.

### 2. Serviço HTTP
Em [frotas.service.ts](../rotalog-frontend/apps/painel-admin/src/app/services/frotas.service.ts), no padrão `fetch` existente:
`async getAlertasManutencao(status?: string): Promise<AlertaManutencao[]>` →
`GET ${API_URL}/api/alertas-manutencao` com query `?status=` quando informado (retorna `[]` em erro, como os demais métodos).

### 3. Tela dedicada com filtro por status
Novo componente standalone `components/alertas/alertas.component.ts` (mesmo padrão dos componentes
existentes, ex. `veiculos.component.ts`):
- Tabela: placa, modelo, motivo (KM/TEMPO), km do alerta, data, status (badge colorido por status).
- **Dropdown de filtro por status**: Todos / PENDENTE / ENVIADA / FALHA → recarrega via `getAlertasManutencao(status)`.
- Estados de loading/erro como nos demais componentes.

### 4. Rota e navegação
- [app.routes.ts](../rotalog-frontend/apps/painel-admin/src/app/app.routes.ts): adicionar `{ path: 'alertas', component: AlertasComponent }`.
- [sidebar.component.ts](../rotalog-frontend/apps/painel-admin/src/app/components/layout/sidebar.component.ts): novo item de menu (🔔 Alertas) apontando para `/alertas`.

### 5. Dashboard (secundário)
Substituir o array `alertas` hardcoded do [dashboard](../rotalog-frontend/apps/painel-admin/src/app/components/dashboard/dashboard.component.ts) por uma chamada a `getAlertasManutencao()`, mapeando para o formato exibido (`tipo: 'warning'`, `mensagem`, `data`). Reaproveita o template/estilos atuais.

## Testes

### Unitário (Jest, padrão Nx Angular)
`components/alertas/alertas.component.spec.ts`:
- monta o componente com `FrotasService` mockado;
- ao iniciar, lista os alertas retornados;
- ao trocar o filtro de status, chama `getAlertasManutencao(status)` e atualiza a tabela;
- estado de erro/vazio.

### E2E (Playwright — fluxo completo)
Novo spec em [painel-admin-e2e](../rotalog-frontend/apps/painel-admin-e2e/src/example.spec.ts) (ex. `alertas.spec.ts`):
- pré-condição: api-frotas e api-notificacoes no ar; disparar a varredura (`POST /api/alertas-manutencao/verificar`) para popular alertas;
- navegar até **Alertas** pela sidebar;
- validar que a lista renderiza linhas;
- aplicar o filtro por status e validar que a tabela reflete o filtro.

## Verificação

1. `pnpm nx test painel-admin` → unitários verdes.
2. `pnpm nx serve painel-admin`; com api-frotas (8080) e api-notificacoes (5000) no ar e a varredura já executada, abrir **Alertas**: lista real + filtro por status funcionando; conferir o dashboard sem os alertas hardcoded.
3. `pnpm nx e2e painel-admin-e2e` → E2E do fluxo completo verde.
