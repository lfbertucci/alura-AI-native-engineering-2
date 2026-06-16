# 006 — Correções SRP de `entregas.js` (ADR 0001)

## Contexto

A [ADR 0001](../rotalog-api-entregas/docs/adr/0001-seguranca-auth-e-responsabilidade-rotas.md)
identifica `src/routes/entregas.js` como um **god file**: mistura roteamento com lógica de negócio,
SQL raw, validação inline, máquina de estados sem validação de transição e deixa o
`notificacaoService` como dead code. A parte de segurança da ADR (`auth.js`) **já foi implementada**
(JWT real + logger winston). Este trabalho resolve a seção **"Arquitetura / Responsabilidade (SRP) —
`entregas.js`"**, que corresponde às decisões **#2–#6** da ADR.

Decisões confirmadas com o usuário:
- **Validação:** instalar **Zod** e criar schemas por rota.
- **Escopo:** itens SRP **+ limpeza incidental** nas rotas reescritas (trocar `console.*` por logger,
  padronizar async/await, parar de vazar `error.message` ao cliente).

Objetivo final: rotas finas (*parse → service → resposta*), lógica de negócio isolada e testável,
notificações funcionando, e cobertura de testes **acima de 90%**.

## Mudanças

### 1. Dependência — `package.json`
- Adicionar `"zod": "^3.23.0"` em `dependencies` e rodar `npm install zod`.

### 2. Novo: `src/schemas/entregaSchemas.js`
Schemas Zod por rota, com mensagens em PT que preservam o contrato atual de erro:
- `criarEntregaSchema`: `origem_endereco`/`destino_endereco` obrigatórios (mensagem
  `'Endereços de origem e destino são obrigatórios'`); `peso_kg` e coordenadas opcionais numéricas.
- `atualizarEntregaSchema`: todos os campos opcionais com tipos corretos.
- `atribuirEntregaSchema`: `veiculo_placa` e `motorista_id` obrigatórios (mensagem
  `'Placa do veículo e ID do motorista são obrigatórios'`).
- `atualizarStatusSchema`: `status` string não-vazia (membership + transição ficam no service, pois a
  resposta precisa do array `statusValidos` e do status atual do banco).

### 3. Novo: `src/middleware/validar.js`
Middleware genérico `validar(schema)` que faz `schema.safeParse(req.body)`; em falha responde
`400 { error: <primeira mensagem> }`; em sucesso normaliza `req.body = result.data` e chama `next()`.

### 4. Novo: `src/services/entregaService.js`
Camada de serviço importando `../models`, `../config/database` (sequelize), `../config/logger` e
`./notificacaoService`. Conteúdo:

**Funções puras (fáceis de testar):**
- `gerarNumeroPedido()` → `'PED-' + crypto.randomUUID()` (único, substitui `Math.random`).
- `calcularDistanciaKm(oLat, oLng, dLat, dLng)` → **Haversine** (substitui a aproximação grosseira);
  retorna `null` se faltar coordenada.
- `calcularTempoEstimado(distanciaKm)` → `Math.ceil(distanciaKm * MIN_POR_KM)` (`MIN_POR_KM = 2`).
- `STATUS_VALIDOS` e mapa `TRANSICOES` + `transicaoValida(de, para)`:
  `PENDENTE→[ATRIBUIDA,CANCELADA]`, `ATRIBUIDA→[EM_TRANSITO,PENDENTE,CANCELADA]`,
  `EM_TRANSITO→[ENTREGUE,CANCELADA]`, `ENTREGUE→[]`, `CANCELADA→[]` (rejeita `ENTREGUE→PENDENTE`).
- Classe `AppError(status, publicMessage, extra)` para erros de negócio mapeáveis a HTTP.

**Orquestração (move a lógica das rotas):**
- `listarEntregas(filtros)`, `buscarPorId(id)` (404), `buscarPorPedido(numero)` (404).
- `obterEstatisticas()` → **agregação Sequelize** (`attributes` com `fn('COUNT'/'AVG', col(...))`,
  `group: ['status']`, `raw: true`) — elimina o SQL raw e o schema hardcoded `entregas.entregas`.
- `criarEntrega(dados)` → gera número, calcula distância/tempo, `Entrega.create`, evento
  `PEDIDO_CRIADO`, dispara `notificarEntregaCriada`.
- `atualizarEntrega(id, dados)` (404 + campos permitidos).
- `atualizarStatus(id, novoStatus)` → 404; valida membership (`AppError 400` com `statusValidos`);
  valida transição (`AppError 400`); aplica `data_coleta`/`data_entrega`; evento `STATUS_ALTERADO`;
  dispara `notificarMudancaStatus` e, se `ENTREGUE`, `notificarEntregaConcluida`.
- `atribuirEntrega(id, dados)` (404; status `ATRIBUIDA`; evento `ENTREGA_ATRIBUIDA`).
- `cancelarEntrega(id)` (404; status `CANCELADA`; evento `ENTREGA_CANCELADA`).

### 5. Reescrever: `src/routes/entregas.js`
Rotas finas, **async/await** em todas (remove os callbacks `.then()` de `/stats`, `/pedido/:n` e
`DELETE`), `validar(schema)` nas rotas POST/PUT/PATCH. Helper `tratarErro(res, err, msgGenerica)`:
se `err.status` → `res.status(err.status).json({ error: err.publicMessage, ...extra })`; caso
contrário `logger.error(...)` + `500 { error: msgGenerica }` (**sem `detalhes`/`error.message`**).
Remove os comentários `FIXME` de dívida e os `console.*` (usa `logger`). Mantém os mesmos códigos de
status e mensagens genéricas por rota já esperados pelos testes (exceto a remoção do `detalhes`).

### 6. `jest.config.js`
Estender `collectCoverageFrom` para os arquivos novos, mantendo o threshold de 90%:
`src/routes/entregas.js`, `src/services/entregaService.js`, `src/middleware/validar.js`,
`src/schemas/entregaSchemas.js` (e manter `src/middleware/auth.js`).

## Testes

### Atualizar `src/routes/entregas.test.js`
- `jest.mock('../services/notificacaoService')` para evitar HTTP real e permitir asserts de disparo.
- **`/stats`**: trocar o mock de `sequelize.query` por `Entrega.findAll` retornando linhas agregadas;
  ajustar asserts (total somado, `por_status`, `gerado_em`).
- **POST**: manter casos de coordenadas/sem-coordenadas e 400; no caso 500 **remover** a expectativa
  de `detalhes`; adicionar assert de `notificarEntregaCriada` chamado.
- **Status**: manter `EM_TRANSITO`/`ENTREGUE`; ajustar o caso `PENDENTE` para uma transição legal
  (`ATRIBUIDA→PENDENTE`); **adicionar** caso `ENTREGUE→PENDENTE` → `400` (transição inválida) e assert
  de `notificarMudancaStatus`/`notificarEntregaConcluida`.
- Demais rotas (GET/PUT/atribuir/DELETE) seguem com os mesmos contratos.

### Novos testes (para manter cobertura > 90%)
- `src/services/entregaService.test.js`: unitários das funções puras (`gerarNumeroPedido` prefixo/
  unicidade, `calcularDistanciaKm` com coordenadas conhecidas e `null`, `calcularTempoEstimado`,
  matriz `transicaoValida`) e caminhos de erro da orquestração (404, status inválido, transição
  inválida) com `../models` e `./notificacaoService` mockados.
- `src/middleware/validar.test.js`: schema válido chama `next`; inválido retorna `400` com a mensagem
  correta.

## Verificação
1. `cd rotalog-api-entregas && npm install zod`
2. `npm test` → toda a suíte verde (100%).
3. `npm run test:coverage` → confirmar **branches/functions/lines/statements ≥ 90%** nos arquivos de
   `collectCoverageFrom`; adicionar testes pontuais se algum ramo do service ficar descoberto.
