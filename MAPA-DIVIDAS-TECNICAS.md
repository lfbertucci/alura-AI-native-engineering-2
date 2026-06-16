# 🗺️ Mapa de Dívidas Técnicas — RotaLog

> Análise estática do workspace `rotalog` (5 projetos).
> Gerado em **2026-06-13**. Sistema de microsserviços poliglota: Node/Express, Java/Spring Boot, .NET/ASP.NET Core, Angular+React, Docker Compose.

## Legenda de severidade
| Nível | Significado |
|---|---|
| 🔴 Crítico | Risco de segurança/perda de dados ou bug em produção |
| 🟠 Alto | Compromete manutenção, escala ou confiabilidade |
| 🟡 Médio | Qualidade/consistência; dívida acumulável |
| 🔵 Baixo | Melhoria incremental |

---

## 🌐 Dívidas Sistêmicas (afetam todo o ecossistema)

Estes problemas atravessam mais de um serviço e são os de maior impacto.

### 🔴 Contratos de dados divergentes entre serviços
Existem **três definições diferentes da mesma entidade** `Veiculo`, todas incompatíveis:

| Origem | Campos-chave | Status enum |
|---|---|---|
| Backend Java ([Veiculo.java](rotalog-api-frotas/src/main/java/com/rotalog/domain/Veiculo.java)) | `placa, modelo, anoFabricacao, quilometragem, dataCadastro` | `ATIVO / INATIVO / MANUTENCAO` |
| Angular ([models/index.ts](rotalog-frontend/apps/painel-admin/src/app/models/index.ts)) | `marca, tipo, ano, km_atual, ultima_manutencao` | `ATIVO / INATIVO / EM_MANUTENCAO / BAIXADO` |
| shared-types ([index.ts](rotalog-frontend/libs/shared-types/src/index.ts)) | `dataCadastro, quilometragem` | `ativo / inativo / manutencao` (minúsculas) |

- O Angular envia `marca`, `tipo`, `km_atual` no POST de veículo, mas o `VeiculoRequest` Java só aceita `placa/modelo/anoFabricacao` → **campos silenciosamente descartados**.
- `km_atual` (front) ≠ `quilometragem` (back); `EM_MANUTENCAO`/`BAIXADO` não existem no backend.

### 🔴 Bug de comparação de status entre Frotas → Entregas
[EntregaClient.java:64](rotalog-api-frotas/src/main/java/com/rotalog/service/EntregaClient.java#L64) compara `"em_transito"`/`"pendente"` (minúsculas), mas a API de entregas grava `EM_TRANSITO`/`PENDENTE` (maiúsculas). `veiculoTemEntregasAtivas()` **sempre retorna `false`** — um veículo com entregas ativas pode ser desativado indevidamente.

### 🟠 Banco de dados único compartilhado (anti-pattern de microsserviços)
- Um único PostgreSQL `rotalog` com schemas `frotas`, `entregas`, `notificacoes` ([init-schemas.sql](rotalog-workspace/tools/scripts/init-schemas.sql)).
- Comentário explícito de violação de fronteira: *"api-notificacoes directly accesses frotas schema"*.
- Um único usuário `rotalog_admin` com `GRANT ALL` em todos os schemas → sem isolamento, sem least-privilege.

### 🟠 Estratégia de migração de banco caótica (4 formas conflitantes)
| Serviço | Mecanismo |
|---|---|
| workspace | Scripts SQL via `docker-entrypoint-initdb.d` (só roda no 1º boot) |
| entregas | `sequelize.sync()` |
| frotas | Flyway **presente porém desabilitado** (`spring.flyway.enabled=false`) |
| notificacoes | `context.Database.EnsureCreated()` |

Nenhuma fonte de verdade; risco de divergência de schema entre ambientes.

### 🔴 Segredos versionados em texto plano
Credenciais hardcoded e comitadas em **todos** os serviços: senha do banco (`rotalog123`), `JWT_SECRET`, senha SMTP, API key de SMS. Detalhado por projeto abaixo.

### 🟠 Resiliência inexistente entre serviços
Nenhuma chamada HTTP inter-serviço tem **timeout, retry ou circuit breaker**. Falha em cascata garantida.

### 🟡 Ausência total de testes automatizados
- entregas: `npm test` → `exit 1` (sem testes).
- frotas: nenhum teste apesar do `spring-boot-starter-test`.
- notificacoes: nenhum projeto de teste.
- frontend: Jest configurado, mas só specs de scaffolding (`nx-welcome`, `example.spec`).

### 🟡 CORS aberto (`*`) e sem HTTPS em todos os serviços
Todos os back-ends liberam qualquer origem; nenhum usa HTTPS.

---

## 📦 rotalog-api-entregas (Node.js / Express)

### Arquitetura
- 🟠 Lógica de negócio dentro das rotas ([entregas.js](rotalog-api-entregas/src/routes/entregas.js)): geração de pedido, cálculo de distância, regras de status — tudo inline, sem camada de serviço.
- 🔴 **Notificações nunca são disparadas**: [notificacaoService.js](rotalog-api-entregas/src/services/notificacaoService.js) está implementado mas **não é importado em nenhuma rota** → dead code; eventos de entrega não notificam ninguém.
- 🟠 Sem graceful shutdown; `uncaughtException`/`unhandledRejection` apenas logam ([index.js:134](rotalog-api-entregas/src/index.js#L134)).
- 🟡 Máquina de estados de entrega sem validação de transição (pode ir de `ENTREGUE` → `PENDENTE`).
- 🟡 Cálculo de distância por aproximação grosseira (não usa Haversine/API de rotas); `numero_pedido` via `Math.random()`.

### Inconsistência no código
- 🟡 Mistura de callbacks (`.then()`) e `async/await` no mesmo arquivo de rotas.
- 🟡 Raw SQL em `/stats` convivendo com ORM Sequelize; `status` como `STRING` em vez de `ENUM` ([Entrega.js:78](rotalog-api-entregas/src/models/Entrega.js#L78)).
- 🟡 Campos denormalizados (`motorista_nome`, `veiculo_modelo`) copiados de outro serviço.
- 🔵 `console.log` como logger; versão hardcoded no health check.

### Segurança
- 🔴 [.env](rotalog-api-entregas/.env) **comitado** com `DB_PASSWORD` e `JWT_SECRET` em texto plano.
- 🔴 Auth fake: [auth.js](rotalog-api-entregas/src/middleware/auth.js) faz **bypass total** quando `NODE_ENV != production` e, mesmo em produção, não valida assinatura/expiração do JWT — só checa se o token tem >10 caracteres.
- 🟠 Endpoints de `/api/rastreamento` **sem autenticação** ([index.js:76](rotalog-api-entregas/src/index.js#L76)).
- 🟠 Stack trace e `error.message` expostos ao cliente ([errorHandler.js](rotalog-api-entregas/src/middleware/errorHandler.js)).
- 🟡 Sem rate limiting, sem validação de input (sem Joi/Zod/express-validator).

### Estado das dependências
- 🟡 `express ^4.18`, `sequelize ^6.28` — defasadas (Express 5 disponível).
- 🟡 `nodemon ^2.0.20` (devDep antiga); única devDependency, sem ferramentas de teste/lint.
- 🔵 Sem `npm audit` no fluxo; lockfile presente mas sem CI.

### Qualidade de infraestrutura
- 🟠 Sem `Dockerfile` — serviço não containerizado.
- 🟠 `sequelize.sync()` no boot em vez de migrations versionadas (risco de alterar schema em produção).
- 🔵 Sem health check real de dependências (banco/serviços retornam `UNKNOWN`).

---

## 🚚 rotalog-api-frotas (Java / Spring Boot)

### Arquitetura
- 🟠 **God service**: [VeiculoService.java](rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoService.java) acumula CRUD, validação, regras de manutenção, custo e notificação.
- 🟠 Sem `@ControllerAdvice` — tratamento de exceção repetido em `try/catch` por endpoint ([VeiculoController.java](rotalog-api-frotas/src/main/java/com/rotalog/controller/VeiculoController.java)).
- 🟠 Controllers retornam a **entidade JPA direto** (sem DTO de resposta); um endpoint retorna **JSON como `String`** montado à mão (`obterEstatisticasFreita`).
- 🟡 `@Inheritance(TABLE_PER_CLASS)` sem necessidade ([Veiculo.java](rotalog-api-frotas/src/main/java/com/rotalog/domain/Veiculo.java)); entidade sem `equals/hashCode/@PrePersist`.
- 🟡 Acoplamento direto a `NotificacaoClient` dentro do service.

### Inconsistência no código
- 🟠 `RuntimeException` genérica para todos os erros de negócio (404, 400, conflito) — impossível mapear status HTTP corretamente.
- 🟡 Field injection (`@Autowired` em campo) em vez de injeção por construtor.
- 🟡 Logs misturando `log.info` (SLF4J) com `System.out.println`; mensagens em PT/EN.
- 🔴 **Typo permanente** no nome do método `obterEstatisticasFreita` (deveria ser "Frota") — exposto na API.
- 🟡 `count` de status feito com `findByStatus(...).size()` (carrega entidades) em vez de query de contagem.

### Segurança
- 🔴 `spring.datasource.password=rotalog123` em [application.properties](rotalog-api-frotas/src/main/resources/application.properties) (comitado).
- 🔴 **Sem autenticação/autorização** — nenhum Spring Security; todos os endpoints abertos.
- 🟠 CORS `allowedOrigins("*")` ([CorsConfig.java](rotalog-api-frotas/src/main/java/com/rotalog/config/CorsConfig.java)).
- 🟡 `@RequestBody` sem `@Valid` apesar de `spring-boot-starter-validation` no classpath.
- 🟡 SQL logado em `DEBUG`/`TRACE` com binders → vaza dados em logs.

### Estado das dependências
- 🔴 **Spring Boot 2.7.14** — linha 2.7 em fim de vida (OSS support encerrado); migrar para 3.x.
- 🟠 **Java 11** (LTS antigo); driver `postgresql 42.5.1` e `flyway-core 8.5.1` defasados (CVEs conhecidos no driver).
- 🟡 `javax.persistence` (Jakarta EE legado) — bloqueador para Spring Boot 3.

### Qualidade de infraestrutura
- 🟠 Sem `Dockerfile`.
- 🟠 Flyway no projeto porém **desabilitado**; migrations reais vivem no docker-compose do workspace.
- 🟡 Sem Spring Actuator/health/metrics (comentado como TODO).
- 🟡 URLs de serviços externos hardcoded em classes (`http://localhost:3000` em [EntregaClient.java:27](rotalog-api-frotas/src/main/java/com/rotalog/service/EntregaClient.java#L27)) em vez de `application.properties`.

---

## 🔔 rotalog-api-notificacoes (.NET / ASP.NET Core)

### Arquitetura
- 🟠 **Clean Architecture abandonada**: MediatR registrado ([Program.cs:38](rotalog-api-notificacoes/Program.cs#L38)) mas **nunca usado** — dependência morta.
- 🟠 **God class** [NotificacaoService.cs](rotalog-api-notificacoes/Services/NotificacaoService.cs): CRUD + envio + template + retry + stats.
- 🟠 Service registrado como **classe concreta** (sem interface) → impossível mockar/testar.
- 🟠 Envio **fake** com `Task.Delay` e **falha aleatória** (`Random().Next`) embutida no código de produção.
- 🟡 Processamento de pendentes exposto como **endpoint HTTP** (`POST /processar`) em vez de job agendado; sem lock distribuído.
- 🟡 Envio síncrono dentro do request de criação (deveria ser fila).

### Inconsistência no código
- 🟡 Mapeamento entidade→DTO manual (sem AutoMapper); validação inline duplicada entre controller e service.
- 🟡 `try/catch (Exception)` genérico em todos os endpoints ([NotificacoesController.cs](rotalog-api-notificacoes/Controllers/NotificacoesController.cs)).
- 🔵 Template engine via `String.Replace` simples.

### Segurança
- 🔴 [appsettings.json](rotalog-api-notificacoes/appsettings.json) com **senha SMTP** (`hardcoded-password-in-config`) e **API key de SMS** comitadas, além da senha do banco.
- 🟠 **Sem autenticação** (`UseAuthorization()` sem nenhum esquema configurado).
- 🟠 CORS `AllowAnyOrigin/Method/Header`; HTTPS redirect comentado.
- 🟠 `detalhes = ex.Message` retornado ao cliente em todos os handlers de erro.

### Estado das dependências
- 🔴 **.NET 6** — fora de suporte (EOL nov/2024). Migrar para .NET 8 LTS.
- 🟠 EF Core 6 / Npgsql 6 defasados; `MediatR 11` (e extensão de DI) pinados e **não utilizados**.
- 🟡 Faltam pacotes citados como TODO: FluentValidation, Polly, Serilog, HealthChecks.

### Qualidade de infraestrutura
- 🟠 Sem `Dockerfile`.
- 🟠 `Database.EnsureCreated()` no boot em vez de migrations; **continua rodando mesmo sem banco** ([Program.cs:92](rotalog-api-notificacoes/Program.cs#L92)).
- 🟡 Health check só por endpoint manual, sem `IHealthCheck`; sem logging estruturado.

---

## 🖥️ rotalog-frontend (Nx · Angular + React)

### Arquitetura
- 🔴 **Dois frameworks no mesmo monorepo**: app `painel-admin` em **Angular 18** e app `rastreamento` em **React 18** ([package.json](rotalog-frontend/package.json)) — duplica stack, build e conhecimento.
- 🟠 **God components**: [veiculos.component.ts](rotalog-frontend/apps/painel-admin/src/app/components/veiculos/veiculos.component.ts) junta lista + filtro + formulário + detalhe + CSS num único arquivo (~460 linhas).
- 🟠 React em **class components** com lógica de negócio e fetch dentro do componente ([App.tsx](rotalog-frontend/apps/rastreamento/src/App.tsx), [TrackingDashboard.tsx](rotalog-frontend/apps/rastreamento/src/components/TrackingDashboard.tsx)); menção a Redux "sem Toolkit" nunca implementado.

### Inconsistência no código
- 🟠 **Três contratos de tipos divergentes** (ver seção sistêmica): `models/index.ts` vs `shared-types` vs backend; snake_case/camelCase misturados; enum `StatusVeiculo.BAIXADO` inexistente no backend.
- 🟠 `fetch` cru em vez de `HttpClient` do Angular; sem interceptors de auth/erro ([frotas.service.ts](rotalog-frontend/apps/painel-admin/src/app/services/frotas.service.ts)).
- 🟠 Cache manual (`veiculosCache`) que **nunca expira**; erros engolidos retornando `[]`/`null`.
- 🟡 URLs de API hardcoded e divergentes (`:3000` no entregas.service, `:8080` no frotas.service) sem `environment`.
- 🟡 Bug de contrato: `entregas.service` filtra por `?motorista=` mas o backend espera `?motorista_id=`.
- 🟡 `PropTypes` em projeto TypeScript; `any` difundido; métodos dead-code (`getEntregasPorMotorista`).

### Segurança
- 🟠 Front consome APIs **sem token** (back-ends sem auth); nenhuma sanitização/escape explícito.
- 🔵 `error.log` versionado no repositório.

### Estado das dependências
- 🟠 Coexistência `@nrwl/*` (legado) e `@nx/*` 19.8.4; Angular 18.2 + React 18.3 + Leaflet.
- 🟡 `prettier ^2.x` (v3 disponível); `@types/node 18.16.9` fixo.
- 🔵 Artefatos do daemon Nx (`.nx/workspace-data/*.db`, `daemon.log`) presentes na árvore.

### Qualidade de infraestrutura
- 🟠 Sem `Dockerfile`/deploy; nenhuma config de ambiente (dev/stg/prod).
- 🟡 Testes só de scaffolding; e2e Playwright apenas com `example.spec`.
- 🔵 Polling com `setInterval(5s)` por componente, sem cancelamento centralizado.

---

## 🐳 rotalog-workspace (Docker Compose)

### Arquitetura
- 🟠 Orquestra **apenas o PostgreSQL** ([docker-compose.yml](rotalog-workspace/docker-compose.yml)) — nenhum dos 4 serviços de aplicação está no compose; impossível subir o sistema completo com um comando.
- 🟠 É o **dono de facto das migrations** de 3 serviços via `docker-entrypoint-initdb.d`, que **só executa no primeiro boot do volume** — alterações posteriores exigem recriar o volume (risco de drift/perda).

### Inconsistência no código
- 🟡 Numeração de scripts mistura migration e seed (`02..08`) sem versionamento real; `08-add-motorista-veiculo-info.sql` sugere patch ad-hoc sobre migrations anteriores.

### Segurança
- 🔴 `POSTGRES_PASSWORD: rotalog123` em texto plano no compose.
- 🟠 Banco exposto em `5432:5432` no host sem rede isolada/senha forte; usuário único com `ALL PRIVILEGES`.

### Estado das dependências
- 🟡 `postgres:14` fixo (PG 16/17 disponíveis); `version: '3.8'` do compose obsoleto.

### Qualidade de infraestrutura
- 🟠 **Sem health checks, sem resource limits, sem backup** (todos marcados como TODO e nunca feitos).
- 🟠 Sem serviços de observabilidade/mensageria que o próprio arquivo lista como TODO (Redis, Kafka, Prometheus, Grafana).
- 🔵 Comentários `FIXME`/`TODO` documentam as próprias falhas sem resolução.

---

## 📊 Resumo por prioridade

| # | Dívida | Severidade | Projetos afetados |
|---|---|---|---|
| 1 | Segredos comitados (senhas/keys/JWT) | 🔴 | todos |
| 2 | Autenticação ausente ou fake | 🔴 | entregas, frotas, notificacoes |
| 3 | Contratos de dados divergentes (Veiculo/Entrega) | 🔴 | frotas, frontend |
| 4 | Bug de casing de status (frotas→entregas) | 🔴 | frotas, entregas |
| 5 | Notificações nunca disparadas (dead code) | 🔴 | entregas |
| 6 | Frameworks pés-de-vida: Spring Boot 2.7 / .NET 6 | 🔴 | frotas, notificacoes |
| 7 | Banco único compartilhado + violação de fronteira | 🟠 | todos |
| 8 | 4 estratégias de migração conflitantes | 🟠 | todos |
| 9 | Sem resiliência (timeout/retry/circuit breaker) | 🟠 | entregas, frotas, notificacoes |
| 10 | Sem containerização das apps / compose incompleto | 🟠 | todos |
| 11 | God classes/components | 🟠 | frotas, notificacoes, frontend |
| 12 | Vazamento de detalhes de erro/stack para o cliente | 🟠 | entregas, frotas, notificacoes |
| 13 | Dois frameworks no front (Angular + React) | 🟠 | frontend |
| 14 | Ausência de testes automatizados | 🟡 | todos |
| 15 | CORS aberto + sem HTTPS | 🟡 | todos |

> **Nota:** boa parte da dívida é *intencional* (codebase didática da Alura — os próprios arquivos trazem comentários `FIXME`/`TODO` sinalizando cada problema). Este mapa consolida e prioriza esses marcadores e adiciona problemas estruturais não anotados (itens 3, 4 e 5 são bugs reais, não apenas TODOs).
