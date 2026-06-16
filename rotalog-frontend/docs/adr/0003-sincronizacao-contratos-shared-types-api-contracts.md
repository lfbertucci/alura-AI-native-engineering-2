# ADR 0003 — Sincronização dos contratos de `shared-types` e `api-contracts` com os backends

- **Status:** Proposto
- **Data:** 2026-06-13
- **Contexto técnico:** rotalog-frontend (Nx 19) · libs `shared-types` e `api-contracts`
- **Componentes afetados:** `libs/shared-types/src/index.ts`, `libs/api-contracts/src/openapi.yaml`
- **Backends de referência (cross-repo):** rotalog-api-frotas (Java/Spring Boot 2.7), rotalog-api-entregas (Node/Express 4), rotalog-api-notificacoes (.NET Core 6)
- **Referências:** [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) (dívida sistêmica de contratos divergentes), [shared-types/index.ts](../../libs/shared-types/src/index.ts), [openapi.yaml](../../libs/api-contracts/src/openapi.yaml), [ADR 0001 painel-admin](./0001-modernizacao-painel-admin-angular.md), [ADR 0002 rastreamento](./0002-modernizacao-app-rastreamento.md)

---

## Contexto

As duas libs de contrato do monorepo foram escritas sem acompanhar a evolução dos três
backends e hoje estão **dessincronizadas com as respostas reais das APIs**. Os próprios
arquivos admitem isso: o [shared-types/index.ts](../../libs/shared-types/src/index.ts) abre
com `// TODO: Interfaces não correspondem com respostas do backend` e o
[openapi.yaml](../../libs/api-contracts/src/openapi.yaml) traz `# TODO: Versão desatualizada
há 2 anos`. Os ADRs [0001](./0001-modernizacao-painel-admin-angular.md) e
[0002](./0002-modernizacao-app-rastreamento.md) já apontaram, como dívida correlata, que os
apps consomem campos que não batem com os tipos declarados.

Esta ADR consolida o resultado de uma **auditoria campo a campo** entre as interfaces/contratos
do frontend e os modelos efetivamente retornados por cada backend, catalogando **(1) campos
faltando, (2) tipos/nomes divergentes e (3) endpoints não documentados ou fantasmas**. Ela é
**apenas documental** — por decisão registrada, **nenhuma correção foi aplicada** às libs ou
aos backends neste momento.

> **Nota de serialização (chave para julgar as divergências):** Java/Jackson (frotas) e
> .NET/System.Text.Json (notificações) emitem o JSON em **camelCase** a partir dos
> getters/propriedades, mesmo com colunas `snake_case` no banco; o Sequelize (entregas) emite
> os **nomes dos atributos do model = snake_case**. Vários comentários `TODO` das libs estão
> **errados** por confundir o nome da coluna com a chave do JSON.

### Problemas identificados

#### `shared-types` — `Veiculo` × Frotas `Veiculo.java` (JSON camelCase)
- **Nome divergente**: `ano` ([index.ts:9](../../libs/shared-types/src/index.ts#L9)) — o backend
  retorna `anoFabricacao`.
- **Case divergente em enum**: `status: 'ativo'|'inativo'|'manutencao'`
  ([index.ts:12](../../libs/shared-types/src/index.ts#L12)) — o backend usa **UPPERCASE**
  (`ATIVO`/`INATIVO`/`MANUTENCAO`).
- **Campo inexistente**: `ultimaManutencao?: Date`
  ([index.ts:15](../../libs/shared-types/src/index.ts#L15)) não existe na entidade (vem de Manutenção).
- **Campo faltando**: `dataAtualizacao`.
- **TODO incorreto**: o comentário sobre `data_cadastro`
  ([index.ts:10](../../libs/shared-types/src/index.ts#L10)) está errado — o JSON é `dataCadastro` (camelCase).

#### `shared-types` — `Motorista` × Frotas `Motorista.java`
- **Campos inexistentes**: `email`, `telefone` e `veiculo_id`
  ([index.ts:21-27](../../libs/shared-types/src/index.ts#L21-L27)) — a entidade não tem esses
  campos nem relacionamento com Veículo.
- **Nomes divergentes**: `numeroCnh` → `cnh`; `dataVencimentoCnh` → `vencimentoCnh`.
- **Tipo+nome divergente**: `ativo: boolean`
  ([index.ts:28](../../libs/shared-types/src/index.ts#L28)) — o backend expõe
  `status: string` (`ATIVO`/`INATIVO`/`FERIAS`).
- **Campos faltando**: `categoriaCnh`, `dataCadastro`, `dataAtualizacao`.

#### `shared-types` — `Entrega` × Entregas `Entrega.js` (Sequelize snake_case) — divergência massiva
O frontend usa nomes **em inglês**; o backend retorna **português snake_case**
([index.ts:31-48](../../libs/shared-types/src/index.ts#L31-L48)):
- `driver_name` → `motorista_nome`; `vehicle_plate` → `veiculo_placa`;
  `origin_address`/`destination_address` → `origem_endereco`/`destino_endereco`;
  `origin_lat/lng`, `destination_lat/lng` → `origem_lat/lng`, `destino_lat/lng`;
  `distance_km` → `distancia_km`; `estimated_time_minutes` → `tempo_estimado_minutos`;
  `events` → `rastreamentos`.
- **Campo inexistente**: `progress_percentage` não existe no model.
- **Case + valor faltando**: `status` é UPPERCASE no backend e inclui `ATRIBUIDA`
  (ausente no union do frontend).
- **Campos faltando**: `motorista_id`, `veiculo_modelo`, `peso_kg`, `observacoes`,
  `data_criacao`, `data_atualizacao`, `data_coleta`, `data_entrega`.

#### `shared-types` — `EntregaEvento` × Entregas `Rastreamento.js`
- **Nomes divergentes**: `timestamp` → `data_evento`; `description` → `descricao`;
  `status` → `evento` ([index.ts:50-54](../../libs/shared-types/src/index.ts#L50-L54)).
- **Campos faltando**: `id`, `entrega_id`, `latitude`, `longitude`.

#### `shared-types` — `Notificacao` × Notificações `Notificacao.cs` (JSON camelCase)
- **Erro semântico**: `tipo: 'email'|'sms'|'webhook'`
  ([index.ts:59](../../libs/shared-types/src/index.ts#L59)) confunde `tipo` com `canal`. No
  backend `tipo` é o **evento** (ex.: `ENTREGA_CRIADA`) e o **canal** (`email`/`sms`) é um
  campo separado.
- **Nome divergente**: `enviado_em` → `dataEnvio`
  ([index.ts:64](../../libs/shared-types/src/index.ts#L64)) — existe (o TODO que diz "não existe" está errado).
- **Campos faltando**: `canal`, `status`, `tentativas`, `maxTentativas`, `erroMensagem`,
  `servicoOrigem`, `referenciaId`, `dataCriacao`, `dataAtualizacao`.

#### `shared-types` — interfaces ausentes por completo
`Manutencao` (Frotas), `Rastreamento` real (o `EntregaEvento` não corresponde),
`TemplateNotificacao` e `ConfiguracaoNotificacao` (.NET), todos os **DTOs de request**
(`VeiculoRequest`, `MotoristaRequest`, `ManutencaoRequest`, `NotificacaoRequest`/`ReenvioRequest`,
payloads de criação/atualização de Entrega) e os **tipos de resposta de estatísticas**
(`/veiculos/estatisticas`, `/entregas/stats`, `/notificacoes/stats`).

#### `api-contracts` — endpoint fantasma e schemas desalinhados
- **Endpoint inexistente**: `GET /api/rastreamento/real-time`
  ([openapi.yaml:61-69](../../libs/api-contracts/src/openapi.yaml#L61-L69)) está marcado como
  `deprecated`, mas nunca existiu nessa forma; os reais são `/api/rastreamento/:entregaId[...]`.
- **Schemas desalinhados**: o schema `Veiculo`
  ([openapi.yaml:78-95](../../libs/api-contracts/src/openapi.yaml#L78-L95)) repete o `status`
  lowercase e omite `anoFabricacao`/`dataAtualizacao`; o schema `Entrega`
  ([openapi.yaml:110-129](../../libs/api-contracts/src/openapi.yaml#L110-L129)) usa nomes em
  inglês e omite a maioria dos campos; `VeiculoInput` não bate com `VeiculoRequest`.

#### `api-contracts` — endpoints reais não documentados
- **Frotas** (prefixo `/api`): detalhe de `/veiculos` (`/{id}`, `/placa/{placa}`,
  `/status/{status}`, `/estatisticas`, `PUT`, `PATCH /{id}/quilometragem|desativar|reativar`)
  e os **recursos inteiros** `/motoristas` e `/manutencoes`.
- **Entregas**: `GET /entregas/stats|/{id}|/pedido/{n}`, `POST /entregas`, `PUT /{id}`,
  `PATCH /{id}/status|/{id}/atribuir`, `DELETE /{id}`; toda a árvore `/rastreamento/*`;
  e o proxy BFF `/api/frotas/*`.
- **Notificações**: o **servidor `:5000` inteiro** está sem paths — `GET /notificacoes`
  (+ filtros), `/{id}`, `/stats`, `/templates`, `POST /notificacoes|/{id}/reenviar|/processar`.

---

## Decisão

A decisão registrada é **documentar a divergência sem corrigir** as libs neste momento — esta
ADR é o entregável da auditoria. Nenhuma alteração foi feita em
[shared-types/index.ts](../../libs/shared-types/src/index.ts),
[openapi.yaml](../../libs/api-contracts/src/openapi.yaml) ou nos backends.

Caso a correção seja priorizada em **trabalho posterior**, o caminho recomendado é **espelhar
os contratos reais** (a forma efetivamente retornada pelas APIs), pois é a opção mais fiel e
sem surpresas em runtime:

1. **Realinhar `shared-types/index.ts`** — renomear/ajustar campos das seções acima
   (`ano`→`anoFabricacao`, status UPPERCASE com `ATRIBUIDA`, snake_case PT em `Entrega`,
   `EntregaEvento`→`Rastreamento`, separar `tipo`/`canal` em `Notificacao`), remover campos
   inexistentes (`ultimaManutencao`, `email`/`telefone`/`veiculo_id`, `progress_percentage`)
   e adicionar os faltantes.
2. **Adicionar as interfaces ausentes**: `Manutencao`, `TemplateNotificacao`,
   `ConfiguracaoNotificacao`, DTOs de request e tipos de `*/stats`.
3. **Atualizar `openapi.yaml`** — remover `/api/rastreamento/real-time`, documentar todos os
   endpoints reais por serviço, corrigir os schemas `Veiculo`/`Entrega` e adicionar os schemas
   e servidores faltantes (incluindo o `:5000`).
4. **Coordenar com a dívida sistêmica de contratos** do MAPA e com os ADRs
   [0001](./0001-modernizacao-painel-admin-angular.md)/[0002](./0002-modernizacao-app-rastreamento.md):
   ao unificar tipos, decidir entre espelhar o backend (recomendado) ou manter os nomes do
   front com uma camada de mapeamento nos serviços HTTP dos apps.

---

## Consequências

### Positivas
- **Inventário único e verificável** das divergências de contrato, servindo de base para a
  correção e para os ADRs 0001/0002 (que já citam o problema como dívida correlata).
- **Type-safety real quando corrigido**: erros como `destino_lat` vs `destination_lat` ou
  status em case errado passariam a ser pegos em build.
- **Documentação de API confiável** (OpenAPI refletindo os endpoints que existem de fato),
  eliminando o endpoint fantasma e cobrindo o serviço de notificações.

### Negativas / Riscos
- **Blast radius ao corrigir**: `shared-types` é importado por `painel-admin` **e**
  `rastreamento`; renomear campos exige `nx affected` e ajustes nos dois apps (vários hoje
  consomem nomes que não batem com os tipos).
- **Estratégia de naming em aberto**: espelhar o backend é mais fiel, mas expõe snake_case PT
  ao código do front; a alternativa (camada de mapeamento) isola os apps ao custo de mais código.
- **Sem emissor de contrato canônico**: como os backends não publicam OpenAPI próprio, o
  contrato precisa ser mantido manualmente em sincronia — risco de regressão futura.
- Enquanto não corrigido, a divergência **permanece silenciosa** (tipos `any`/uso direto nos
  apps mascaram o problema), conforme apontado no ADR 0002.

> **Verificação (no trabalho de implementação, se houver):** build/lint sempre via Nx
> (`npm exec nx run shared-types:build`, lint/validador do OpenAPI) e
> `npm exec nx affected -t build lint test` nos apps consumidores; spot-check subindo os
> backends via `rotalog-workspace/docker-compose.yml` e comparando o JSON real de
> `GET /api/veiculos`, `/api/entregas` e `/api/notificacoes` com os tipos.

> **Nota:** boa parte desta dívida é *intencional* (codebase didática da Alura — os próprios
> arquivos trazem `TODO`/`FIXME` sinalizando cada problema). Esta ADR consolida esses
> marcadores, adiciona os problemas não anotados (endpoint fantasma, recursos inteiros sem
> documentação, erro semântico `tipo`/`canal`) e registra o caminho de correção recomendado.
