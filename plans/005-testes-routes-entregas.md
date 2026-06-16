# Plano: Testes para `entregas.js`

## Contexto

O arquivo [entregas.js](../rotalog-api-entregas/src/routes/entregas.js) concentra todas as rotas REST de entregas (9 endpoints: listar, stats, buscar por id, buscar por pedido, criar, atualizar, status, atribuir, cancelar) e **não possui testes**. O único teste do repositório é [auth.test.js](../rotalog-api-entregas/src/middleware/auth.test.js), que cobre apenas o middleware de autenticação.

O objetivo é criar uma suíte de testes para esse arquivo de rotas, garantir que **passe** e atinja **>90% de cobertura**. As rotas dependem de banco (models Sequelize + `sequelize.query` raw), então os testes usam **mocks** — nenhum PostgreSQL é necessário.

Abordagem escolhida pelo usuário: **`supertest`** (montar o router num app Express e fazer requisições HTTP contra models mockados).

## Mudanças

### 1. Adicionar dependência `supertest`
- Adicionar `supertest` em `devDependencies` no [package.json](../rotalog-api-entregas/package.json).
- Instalar via `npm install --save-dev supertest` dentro de `rotalog-api-entregas`.

### 2. Atualizar configuração de cobertura
Em `rotalog-api-entregas/jest.config.js`:
- Adicionar `'src/routes/entregas.js'` ao array `collectCoverageFrom` (mantendo `auth.js`).
- Threshold global de 90% (branches/functions/lines/statements) permanece — a suíte nova deve manter o conjunto acima de 90%.

### 3. Criar `rotalog-api-entregas/src/routes/entregas.test.js`

**Estratégia de mock** (no topo, antes de `require` do router):
- `jest.mock('../models', ...)` → fornece `Entrega` e `Rastreamento` como objetos com métodos `jest.fn()`: `findAll`, `findByPk`, `findOne`, `create`. Instâncias retornadas têm `save: jest.fn()` e campos mutáveis.
- `jest.mock('../config/database', ...)` → fornece `sequelize` com `query: jest.fn()` e own-property `constructor = { QueryTypes: { SELECT: 'SELECT' } }` (necessário para a rota `/stats` que usa `sequelize.constructor.QueryTypes.SELECT`).
- Silenciar `console.log`/`console.error` com `jest.spyOn(...).mockImplementation(() => {})` para manter a saída limpa.

**Setup do app**: montar o router num `express()` com `express.json()` em `/api/entregas` e usar `supertest(app)`.

**Casos de teste por endpoint** (sucesso + erro + branches relevantes):

| Endpoint | Casos |
|---|---|
| `GET /` | 200 lista; aplica filtros `veiculo`/`status`/`motorista_id` (verificar `where` passado ao `findAll`); 500 em erro |
| `GET /stats` | 200 agrega resultados (soma `total`); 500 em erro da query |
| `GET /:id` | 200 encontrada; 404 não encontrada; 500 em erro |
| `GET /pedido/:numeroPedido` | 200 encontrada; 404 não encontrada; 500 em erro |
| `POST /` | 201 criação completa (com coords → calcula `distancia_km`/`tempo_estimado`); 201 sem coords (campos null); 400 sem endereços; 500 em erro (verifica `detalhes` exposto) |
| `PUT /:id` | 200 atualização parcial; 404 não encontrada; 500 em erro |
| `PATCH /:id/status` | 200 status válido (branches `EM_TRANSITO`→`data_coleta`, `ENTREGUE`→`data_entrega`); 400 status inválido; 404 não encontrada; 500 em erro |
| `PATCH /:id/atribuir` | 200 atribuição; 400 sem `veiculo_placa`/`motorista_id`; 404 não encontrada; 500 em erro |
| `DELETE /:id` | 200 cancelamento (soft delete → status `CANCELADA`); 404 não encontrada; 500 em erro |

Asserções incluem: status HTTP, corpo JSON, e que os mocks (`findAll`/`create`/`save`) foram chamados com os argumentos esperados (ex.: `Rastreamento.create` chamado com evento correto em criação/status/atribuição/cancelamento).

## Reuso de padrões existentes
- Seguir o estilo de [auth.test.js](../rotalog-api-entregas/src/middleware/auth.test.js): `test(...)` em português, `beforeEach`/`afterEach`, mocks com `jest.fn()`.
- `clearMocks: true` já está no jest.config — mocks são limpos entre testes automaticamente.

## Verificação
Dentro de `rotalog-api-entregas`:
1. `npm install` (garante `supertest`).
2. `npm test` → todos os testes (auth + entregas) passam.
3. `npm run test:coverage` → confirmar:
   - `src/routes/entregas.js` com **>90%** em statements/branches/functions/lines.
   - Threshold global de 90% satisfeito (build não falha por cobertura).
