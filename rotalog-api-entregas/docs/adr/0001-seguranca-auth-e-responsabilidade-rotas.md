# ADR 0001 — Segurança do middleware de autenticação e responsabilidade das rotas de entregas

- **Status:** Proposto
- **Data:** 2026-06-13
- **Contexto técnico:** rotalog-api-entregas (Node.js / Express 4)
- **Componentes afetados:** `src/middleware/auth.js`, `src/routes/entregas.js`
- **Referências:** [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) (seção "📦 rotalog-api-entregas"), [auth.js](../../src/middleware/auth.js), [entregas.js](../../src/routes/entregas.js)

---

## Contexto

A API de entregas concentra em dois arquivos os problemas de maior risco do serviço. O
[middleware de autenticação](../../src/middleware/auth.js) é **fake** — não valida o token de
verdade e ainda libera todo o tráfego fora de produção — e o [arquivo de rotas de entregas](../../src/routes/entregas.js)
atua como um **god file**, misturando roteamento com lógica de negócio, SQL raw, logging por
`console.log` e excesso de comentários `FIXME`. O
[MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) já classifica esses pontos como 🔴/🟠 na
seção do serviço.

Esta ADR consolida os problemas **atuais e potenciais** de **arquitetura, vulnerabilidade e
responsabilidade** e registra as decisões de correção. Ela é **apenas documental** — nenhuma
refatoração de código foi executada e **nenhuma dependência foi instalada** neste momento.

### Problemas identificados

#### Segurança / Vulnerabilidade — `auth.js`
- **JWT secret hardcoded com fallback no código**: `process.env.JWT_SECRET || 'super-secret-key-that-should-not-be-hardcoded'`
  ([auth.js:12](../../src/middleware/auth.js#L12)). O segredo fica versionado e, na ausência da env,
  é silenciosamente substituído por um valor público — derrota qualquer garantia de assinatura.
- **Bypass total de autenticação fora de produção** ([auth.js:16-19](../../src/middleware/auth.js#L16-L19)):
  quando `NODE_ENV !== 'production'`, o middleware faz `return next()` sem checar nada — qualquer
  request passa sem token em dev/staging.
- **"Validação" fake mesmo em produção**: apenas verifica a presença do header `Bearer` e
  `token.length >= 10` ([auth.js:28-38](../../src/middleware/auth.js#L28-L38)). **Não há
  decodificação, verificação de assinatura nem de expiração** ([auth.js:40-42](../../src/middleware/auth.js#L40-L42)) —
  qualquer string com 10+ caracteres é aceita como token válido.
- **`req.user` fixo de admin** injetado para todas as requisições ([auth.js:46](../../src/middleware/auth.js#L46)):
  `{ id: 1, nome: 'Admin', role: 'admin' }` — escalonamento de privilégio implícito; não há RBAC
  real, refresh token nem identidade derivada do token.
- **`console.log` para eventos de autenticação** ([auth.js:17](../../src/middleware/auth.js#L17),
  [auth.js:43](../../src/middleware/auth.js#L43)) — viola a convenção do serviço (logging sempre via
  logger dedicado; nunca `console.log` em código de produção).

> **Correlatos sistêmicos (contexto, fora do escopo desta ADR):** o `.env` está comitado com
> `JWT_SECRET`/`DB_PASSWORD` em texto plano, e o grupo de rotas `/api/rastreamento` é montado **sem o
> middleware de auth** ([index.js:76](../../src/index.js#L76)). Ficam registrados aqui por relação
> direta com a postura de segurança, mas serão tratados em ADRs/trabalho próprios.

#### Arquitetura / Responsabilidade (SRP) — `entregas.js`
- **Lógica de negócio inline nas rotas** (o arquivo deveria conter apenas roteamento):
  - geração de `numero_pedido` com `Math.random` ([entregas.js:153](../../src/routes/entregas.js#L153)) —
    não é único/idempotente;
  - cálculo de distância por aproximação grosseira ([entregas.js:155-162](../../src/routes/entregas.js#L155-L162))
    em vez de Haversine/API de rotas;
  - tempo estimado por regra hardcoded de 2 min/km ([entregas.js:165](../../src/routes/entregas.js#L165));
  - regras de status e efeitos colaterais (datas de coleta/entrega) embutidas no handler
    ([entregas.js:244-260](../../src/routes/entregas.js#L244-L260)).
- **SQL raw no `GET /stats`** ([entregas.js:67-91](../../src/routes/entregas.js#L67-L91)) convivendo
  com o ORM Sequelize, inclusive com o nome do schema **hardcoded** (`entregas.entregas`) — acopla a
  rota ao layout físico do banco.
- **Validação de input inline** ([entregas.js:148](../../src/routes/entregas.js#L148),
  [entregas.js:244-248](../../src/routes/entregas.js#L244-L248)) em vez de middleware de validação
  (Joi/Zod/express-validator).
- **Máquina de estados sem validação de transição** ([entregas.js:250](../../src/routes/entregas.js#L250)):
  é possível ir de `ENTREGUE` → `PENDENTE`, pois só se valida se o status pertence à lista, não se a
  transição é legal.
- **Notificações nunca disparadas**: o [notificacaoService.js](../../src/services/notificacaoService.js)
  está implementado mas **não é importado em nenhuma rota** — dead code; eventos de entrega
  (criação, mudança de status, conclusão) não notificam ninguém.

#### Inconsistência / Qualidade de código — `entregas.js`
- **Mistura de callbacks (`.then()`) e async/await** no mesmo arquivo: `/stats`
  ([entregas.js:77](../../src/routes/entregas.js#L77)), `/pedido/:numeroPedido`
  ([entregas.js:120](../../src/routes/entregas.js#L120)) e `DELETE /:id`
  ([entregas.js:336](../../src/routes/entregas.js#L336)) em callback; o restante em async/await.
- **`console.log`/`console.error` como logger** em praticamente todas as rotas (ex.:
  [54](../../src/routes/entregas.js#L54), [88](../../src/routes/entregas.js#L88),
  [192](../../src/routes/entregas.js#L192), [272](../../src/routes/entregas.js#L272),
  [321](../../src/routes/entregas.js#L321)).
- **Comentários `FIXME`/cabeçalhos em excesso** documentando dívidas em vez de comportamento — ruído
  no cabeçalho do arquivo e em quase toda rota.
- **Vazamento de `error.message` ao cliente** no `POST /` ([entregas.js:198](../../src/routes/entregas.js#L198)) —
  expõe detalhes internos.
- **`limit` hardcoded** no `include` de rastreamentos do `GET /` ([entregas.js:47](../../src/routes/entregas.js#L47)).

---

## Decisão

As correções recomendadas (a serem implementadas em **trabalho posterior** — esta ADR não altera
código) são:

1. **Autenticação real (`auth.js`)**: adotar `jsonwebtoken` para validar **assinatura + expiração**
   do JWT; ler `JWT_SECRET` **somente via env** (sem fallback hardcoded), **falhando o boot** se
   ausente; **remover o bypass de desenvolvimento**; popular `req.user` a partir do **payload do
   token** (id/role reais); substituir `console.log` por logger dedicado.
   *(A dependência `jsonwebtoken` será instalada no trabalho de implementação — não agora.)*

2. **Extrair camada de serviço** (`src/routes/entregas.js` → `src/services/entregaService.js`):
   mover geração de número de pedido, cálculo de distância (Haversine), regras/transição de status e
   validações para fora das rotas. As rotas ficam finas: *parse de input → chamada ao service →
   resposta*.

3. **Substituir o SQL raw do `/stats`** por agregação do Sequelize (`fn`/`col`/`group`), eliminando
   o nome de schema hardcoded e a query montada como string.

4. **Validação de input via middleware** (Joi/Zod/express-validator) com schemas por rota, removendo
   os `if` inline.

5. **Validação de transição de estado** em uma máquina de estados explícita (mapa de transições
   permitidas), rejeitando saltos inválidos (ex.: `ENTREGUE` → `PENDENTE`).

6. **Disparar notificações** integrando o `notificacaoService` nos eventos relevantes (entrega
   criada, mudança de status, entrega concluída), eliminando o dead code.

7. **Padronizar logging** com logger dedicado (ex.: pino/winston), removendo todos os `console.*`.

8. **Padronizar async/await** (eliminar callbacks) e **enxugar comentários/`FIXME`** excessivos.

9. **Parar de expor `error.message`/stack ao cliente**, centralizando o tratamento no
   `errorHandler` ([errorHandler.js](../../src/middleware/errorHandler.js)).

---

## Consequências

### Positivas
- **Autenticação confiável**: tokens efetivamente verificados (assinatura/expiração), sem bypass e
  sem identidade de admin fixa.
- **Rotas finas e testáveis**, com aderência ao **Single Responsibility Principle**; lógica de
  negócio isolada e reutilizável na camada de serviço.
- **Menos acoplamento ao banco** (fim do SQL raw com schema hardcoded) e **validação consistente**
  via middleware.
- **Notificações funcionando** (fim do dead code) e **logging consistente** via logger dedicado.
- Menos ruído de comentários e padronização de estilo (async/await).

### Negativas / Riscos
- Exige **instalar `jsonwebtoken`** e **provisionar `JWT_SECRET`** em todos os ambientes; **remover o
  bypass de dev pode quebrar fluxos** que dependiam de chamar a API sem token.
- Necessário **alinhar o emissor do token** (quem assina o JWT hoje?) — sem um emissor real, a
  autenticação verdadeira não funciona ponta a ponta.
- **Aumento no número de arquivos** do módulo (camada de serviço, schemas de validação).
- Trocar a aproximação de distância por Haversine pode **alterar valores** já gravados/relatados.

> **Nota:** boa parte desta dívida é *intencional* (codebase didática da Alura — os próprios arquivos
> trazem comentários `FIXME` sinalizando cada problema). Esta ADR consolida esses marcadores, adiciona
> os problemas estruturais (god file, dead code de notificação, transição de estado inválida) e
> registra o caminho de correção recomendado.
