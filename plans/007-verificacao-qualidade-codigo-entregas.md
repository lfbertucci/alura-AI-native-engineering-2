# 007 — Verificação "Inconsistência / Qualidade de código — `entregas.js`" (ADR 0001)

## Contexto

A solicitação foi aplicar as correções do item **"#### Inconsistência / Qualidade de código —
`entregas.js`"** da [ADR 0001](../rotalog-api-entregas/docs/adr/0001-seguranca-auth-e-responsabilidade-rotas.md),
ajustar os testes para 100% verdes e manter a cobertura acima de 90%.

Durante a exploração ficou claro que **essa seção já foi integralmente resolvida** no
`entregas.js` pelo plano [006](006-correcao-srp-rotas-entregas.md) (commits "refactor" +
"Correçoes"), que extraiu a camada de serviço (`entregaService.js`) e fez a limpeza incidental.
Os mesmos anti-padrões ainda existem em arquivos irmãos (`rastreamento.js`, `frotas.js`,
`errorHandler.js`, `frotasService.js`, `notificacaoService.js`), mas o usuário decidiu **manter o
escopo apenas em `entregas.js`**: confirmar que a seção está cumprida, rodar os testes e garantir
cobertura ≥90% — **sem alterar código-fonte de produção**.

## Estado atual de `entregas.js` vs. os 5 itens da seção da ADR

Arquivo: [src/routes/entregas.js](../rotalog-api-entregas/src/routes/entregas.js)

| Item da ADR | Estado em `entregas.js` |
|---|---|
| Mistura de callbacks (`.then()`) e async/await | ✅ Todas as rotas usam `async/await`; sem `.then()` |
| `console.log`/`console.error` como logger | ✅ Usa `logger` winston (`../config/logger`) via `tratarErro` |
| Comentários `FIXME`/cabeçalhos em excesso | ✅ Apenas separadores de seção; nenhum `FIXME` |
| Vazamento de `error.message` ao cliente no `POST /` | ✅ `tratarErro` retorna mensagem genérica; `error.message` só vai para `logger.error` |
| `limit` hardcoded no `include` do `GET /` | ✅ Movido para `entregaService.listarEntregas` (`limit: 5`) |

Conclusão: **nenhuma alteração de código de produção é necessária** em `entregas.js`.

## Trabalho a executar

### 1. Rodar a suíte de testes
```
cd "e:/Projetos ALURA - Carreira IA Native/rotalog/rotalog-api-entregas"
npm test
```
Confirmar que **todos os testes passam (100% verde)**. Arquivos de teste existentes:
`src/routes/entregas.test.js`, `src/services/entregaService.test.js`,
`src/middleware/auth.test.js`, `src/middleware/validar.test.js`.

### 2. Verificar cobertura ≥90%
```
npm run test:coverage
```
O threshold já está configurado em [jest.config.js](../rotalog-api-entregas/jest.config.js)
(`branches/functions/lines/statements: 90` global) sobre os 5 arquivos do `collectCoverageFrom`
(`auth.js`, `validar.js`, `routes/entregas.js`, `services/entregaService.js`,
`schemas/entregaSchemas.js`).

- Se o comando **passar** (threshold satisfeito), nada a fazer além de relatar os números.
- Se **alguma linha/branch de `entregas.js`** (ou dos demais arquivos medidos) ficar **abaixo de
  90%**, adicionar testes-alvo para fechar a lacuna — **somente testes**, seguindo o padrão já
  estabelecido em `entregas.test.js` (mock de `entregaService` via `jest.requireActual` para
  preservar `AppError`; `supertest` no app Express isolado). Nenhuma alteração no código de produção.

### 3. Relatar
Resumir ao usuário:
- que a seção "Inconsistência / Qualidade de código — `entregas.js`" já estava cumprida (tabela acima);
- resultado de `npm test` (nº de testes / suites);
- números de cobertura (`% Stmts / Branch / Funcs / Lines`) dos 5 arquivos, confirmando ≥90%;
- que os mesmos anti-padrões permanecem em `rastreamento.js` / `frotas.js` / `errorHandler.js` /
  serviços de integração, caso queira tratá-los em trabalho futuro (fora deste escopo).

## Arquivos

- **Sem alteração de produção.**
- Possível adição: novos casos de teste em
  [src/routes/entregas.test.js](../rotalog-api-entregas/src/routes/entregas.test.js)
  (ou `entregaService.test.js`) **apenas se** a cobertura ficar abaixo de 90%.

## Verificação final

`npm run test:coverage` termina com exit 0 (suíte verde + threshold global de 90% satisfeito).
