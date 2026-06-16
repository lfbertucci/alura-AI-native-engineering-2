# Plano: Correção de vulnerabilidade no `auth.js` (rotalog-api-entregas) — ADR 0001, Decisão #1

## Contexto

A [ADR 0001](../rotalog-api-entregas/docs/adr/0001-seguranca-auth-e-responsabilidade-rotas.md)
classifica o middleware [auth.js](../rotalog-api-entregas/src/middleware/auth.js) como autenticação
**fake**: secret JWT hardcoded com fallback público, bypass total fora de produção, "validação" que
só checa `length >= 10` (sem assinatura/expiração), `req.user` admin fixo e `console.log` para
eventos de auth. Isso derrota qualquer garantia de autenticação.

Este plano implementa **a Decisão #1 da ADR** (escopo: `auth.js` + suporte mínimo). As demais
decisões (refator de `entregas.js`, SQL raw, notificações etc.) estão **fora de escopo**.

Resultado pretendido: autenticação real via `jsonwebtoken` (assinatura + expiração), secret só por
env (sem fallback), sem bypass, `req.user` derivado do payload, logging via logger dedicado — com
testes 100% verdes e cobertura > 90% (alvo do `jest.config.js`, que coleta cobertura apenas de
`src/middleware/auth.js`).

## Decisões confirmadas com o usuário
- **Logging:** instalar **winston** e criar um módulo de logger dedicado, usado pelo `auth.js`.
- **JWT_SECRET ausente:** `auth.js` responde **500** (nunca libera) **e** um guard no boot
  (`index.js`) **falha a inicialização** se a env estiver ausente.

## Mudanças

### 1. `rotalog-api-entregas/package.json`
- `npm install jsonwebtoken winston` (entram em `dependencies`).

### 2. `rotalog-api-entregas/src/config/logger.js` (novo)
- Logger winston dedicado: `level` via `process.env.LOG_LEVEL || 'info'`, formato `timestamp + json`,
  transport `Console`. `silent: process.env.NODE_ENV === 'test'` para não poluir a saída dos testes.
- Exportar a instância (`module.exports = logger`).

### 3. `rotalog-api-entregas/src/middleware/auth.js` (reescrever)
- `const jwt = require('jsonwebtoken')` e `const logger = require('../config/logger')`.
- Ler `const secret = process.env.JWT_SECRET` **sem fallback**. Se ausente → `logger.error(...)` e
  `return res.status(500).json({ error: 'Erro de configuração de autenticação' })` (nunca chama `next`).
- **Remover** o bloco de bypass `NODE_ENV !== 'production'`.
- Manter validações de header: ausência → 401 `Token não fornecido`;
  `parts.length !== 2 || parts[0] !== 'Bearer'` → 401 `Token mal formatado`.
- Substituir a "validação fake" por `jwt.verify(token, secret)` em `try/catch`:
  - sucesso → `req.user = { id: payload.sub || payload.id, nome: payload.nome, role: payload.role }` e `next()`.
  - erro (assinatura/expiração/malformado) → `logger.warn('Falha na verificação do token JWT', { erro: err.message })` e 401 `Token inválido`.
- Remover todos os `console.log` e os comentários `FIXME` do cabeçalho.

### 4. `rotalog-api-entregas/src/index.js` (guard de boot)
- No início do `try` de `startServer()`, antes de `testConnection()`:
  `if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET não configurado — abortando inicialização'); }`
  O `catch` existente já faz `process.exit(1)`. Mudança mínima e pontual; não tocar no restante do arquivo.

### 5. `rotalog-api-entregas/src/middleware/auth.test.js` (reescrever)
Os cenários atuais (bypass de dev, token fake `>=10` chars, `req.user` admin fixo) ficam inválidos.
Nova suíte baseada em `jsonwebtoken`:
- `beforeEach`: definir `process.env.JWT_SECRET = 'test-secret'`; montar `req/res/next` mockados
  (mesmo padrão `status`/`json` atual).
- Cenários:
  1. `JWT_SECRET` ausente (`delete process.env.JWT_SECRET`) → 500 + mensagem de config; `next` não chamado.
  2. Sem header `Authorization` → 401 `Token não fornecido`.
  3. Header com uma só parte → 401 `Token mal formatado`.
  4. Esquema ≠ Bearer (ex.: `Basic ...`) → 401 `Token mal formatado`.
  5. Token inválido (string lixo) → 401 `Token inválido`; `next` não chamado.
  6. Token **expirado** (`jwt.sign(payload, secret, { expiresIn: -10 })`) → 401 `Token inválido`
     (cobre o ramo de expiração).
  7. Token **válido** (`jwt.sign({ sub, nome, role }, secret)`) → `req.user` derivado do payload e
     `next()` chamado uma vez.
  8. Token válido com `id` no lugar de `sub` → cobre o ramo `payload.sub || payload.id`.
- Cobrir ambos os lados de cada branch mantém cobertura > 90%.

## Arquivos
- Modificar: `src/middleware/auth.js`, `src/middleware/auth.test.js`, `src/index.js`, `package.json` (+ `package-lock.json`).
- Criar: `src/config/logger.js`.

## Verificação
Em `rotalog-api-entregas/`:
1. `npm install jsonwebtoken winston` — confirmar entrada em `dependencies`.
2. `npm test` — todos os testes passam (suíte reescrita de `auth.test.js`).
3. `npm run test:coverage` — cobertura de `auth.js` > 90% (o `coverageThreshold` falha o comando se cair abaixo).
4. Conferência manual: nenhum `console.*` remanescente em `auth.js`; sem fallback de secret; sem bypass por `NODE_ENV`.

## Nota de impacto (comportamental)
Remover o bypass de desenvolvimento significa que, a partir desta mudança, **dev/staging/test também
exigem um JWT válido** nas rotas protegidas (`/api/entregas`, `/api/frotas`). É a postura recomendada
pela ADR; quem chamava a API sem token em dev precisará emitir/assinar um token com `JWT_SECRET`.
