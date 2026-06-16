# Plano: Testes para `auth.js` (rotalog-api-entregas) com ≥90% de cobertura

## Contexto

O middleware [auth.js](../rotalog-api-entregas/src/middleware/auth.js) está hoje **sem cobertura de testes** e o projeto `rotalog-api-entregas` **não tem infraestrutura de testes**: o script `test` é um placeholder (`echo "Error: no test specified" && exit 1`) e Jest não está instalado (única devDep é `nodemon`). Apesar de o agente `node-entregas` definir "Testes: Jest" como convenção, nada está configurado.

O objetivo é instalar/configurar Jest e escrever uma suíte de **testes de caracterização** que documente e trave o comportamento atual do `authMiddleware`, atingindo **≥90% de cobertura** desse arquivo.

**Decisão de escopo (confirmada com o usuário):** apenas testar o comportamento atual — **não** refatorar o `auth.js` para validação JWT real. O arquivo de produção não será alterado.

## Comportamento atual a caracterizar

`authMiddleware(req, res, next)` em [auth.js](../rotalog-api-entregas/src/middleware/auth.js):
1. **Bypass em dev:** se `process.env.NODE_ENV !== 'production'` → chama `next()` e retorna (loga "[AUTH] Bypass em desenvolvimento"); `req.user` não é definido.
2. **Sem header (prod):** `Authorization` ausente → `401 { error: 'Token não fornecido' }`.
3. **Header mal formatado (prod):** `parts.length !== 2` **ou** `parts[0] !== 'Bearer'` → `401 { error: 'Token mal formatado' }`.
4. **Token inválido/curto (prod):** token vazio ou `length < 10` → `401 { error: 'Token inválido' }`.
5. **Token aceito (prod):** `Bearer <token ≥10 chars>` → `next()` é chamado, `req.user = { id: 1, nome: 'Admin', role: 'admin' }` (loga "[AUTH] Token aceito (sem validação real)").

## Mudanças

### 1. `rotalog-api-entregas/package.json`
- Adicionar devDependency: `"jest": "^29.7.0"` (mesma major do `rotalog-frontend`, para consistência no monorepo).
- Atualizar scripts:
  - `"test": "jest"`
  - `"test:coverage": "jest --coverage"`

### 2. `rotalog-api-entregas/jest.config.js` (novo)
- `testEnvironment: 'node'`
- `collectCoverageFrom: ['src/middleware/auth.js']` (foco do escopo atual)
- `coverageThreshold` global em **90%** para `branches`, `functions`, `lines`, `statements` — garante a meta de forma automatizada.
- `clearMocks: true`

### 3. `rotalog-api-entregas/src/middleware/auth.test.js` (novo, colocado ao lado do source)
Suíte cobrindo os 5 cenários acima. Padrão de cada teste:
- **Mocks:** `req = { headers: {} }`; `res` com `status: jest.fn().mockReturnThis()` e `json: jest.fn()`; `next = jest.fn()`.
- **NODE_ENV:** salvar `process.env.NODE_ENV` em `beforeEach` e restaurar em `afterEach`; definir `'production'` nos testes de validação e um valor não-prod (ex.: `'test'`) no teste de bypass.
- **console.log:** `jest.spyOn(console, 'log').mockImplementation(() => {})` para silenciar e (opcionalmente) asserir as mensagens de log.

Casos:
| # | Setup | Asserção |
|---|-------|----------|
| 1 | NODE_ENV != production | `next()` chamado; `req.user` undefined; `res.status` não chamado |
| 2 | prod, sem `authorization` | `res.status(401)` + `json({ error: 'Token não fornecido' })`; `next` não chamado |
| 3a | prod, header com 1 parte (`'abc'`) | 401 `'Token mal formatado'` |
| 3b | prod, `'Basic xyz...'` (parts[0] != Bearer) | 401 `'Token mal formatado'` |
| 4 | prod, `'Bearer short'` (<10 chars) | 401 `'Token inválido'` |
| 5 | prod, `'Bearer ' + 'a'.repeat(20)` | `next()` chamado; `req.user = { id:1, nome:'Admin', role:'admin' }` |

Esses casos exercitam todas as branches (bypass, header ausente, ambas sub-condições de "mal formatado", token curto, sucesso) → cobertura esperada de 100% das linhas/branches do `auth.js`, acima do limite de 90%.

## Arquivos
- Modificar: `rotalog-api-entregas/package.json`
- Criar: `rotalog-api-entregas/jest.config.js`
- Criar: `rotalog-api-entregas/src/middleware/auth.test.js`
- **Não** alterar: `rotalog-api-entregas/src/middleware/auth.js`

## Verificação
1. `cd rotalog-api-entregas && npm install` (instala Jest).
2. `npm test` → todos os testes passam.
3. `npm run test:coverage` → tabela de cobertura mostra `auth.js` ≥90% (esperado 100%); o `coverageThreshold` faz o comando falhar se cair abaixo de 90%.
