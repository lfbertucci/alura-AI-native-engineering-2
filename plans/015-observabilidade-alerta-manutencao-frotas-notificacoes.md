# Observabilidade no fluxo de alerta de manutenção

## Contexto

O fluxo de alerta de manutenção preventiva cruza dois serviços, mas hoje não há
como correlacionar uma execução entre eles: cada um loga em texto plano e sem
identificador comum. Quando um alerta não chega, é impossível seguir o rastro do
`rotalog-api-frotas` até o `rotalog-api-notificacoes`.

O objetivo é adicionar **observabilidade básica**: logs estruturados em JSON nos
dois serviços e um **correlation-id** gerado no frotas que acompanha cada
requisição HTTP até o notificacoes, via header `X-Correlation-ID`.

**Fluxo atual (ponta a ponta):**
`AlertaManutencaoScheduler.executar()` (ou `POST /api/alertas-manutencao/verificar`)
→ busca veículos ATIVO → por veículo `ManutencaoPreventivaService.verificarEAlertar()`
→ `VeiculoNotificacaoService.notificarAlertaManutencao()`
→ `NotificacaoClient.enviarNotificacao()` (HTTP POST `/api/notificacoes`)
→ **notificacoes** `NotificacoesController.Criar()` → `NotificacaoService.CriarNotificacao()`
→ `TentarEnviar()` → `EnviarEmail()`.

**Decisões confirmadas com o usuário:**
- Correlation-id **por veículo/requisição** (um id único por chamada HTTP ao
  notificacoes, rastreável ponta a ponta). Logs de batch (início/contagem) usam
  um `runId` de execução separado.
- JSON no Java via **`logstash-logback-encoder`** (abordagem convencional do
  ecossistema Logback).

Boa parte dos pontos de log pedidos **já existe** em texto; o trabalho central é
formatar em JSON e propagar o correlation-id. Mudanças pequenas preenchem as
lacunas.

---

## Parte 1 — rotalog-api-frotas (Java / Spring Boot 2.7)

### 1.1 Dependência + config JSON
- **`pom.xml`**: adicionar `net.logstash.logback:logstash-logback-encoder`
  (versão **7.2**, compatível com Logback 1.2.x do Spring Boot 2.7).
- **Novo `src/main/resources/logback-spring.xml`**: console appender com
  `LogstashEncoder` (ou `LoggingEventCompositeJsonEncoder`), incluindo o MDC
  automaticamente. Os níveis em `application.properties`
  (`logging.level.com.rotalog=DEBUG`, etc.) continuam válidos — o Spring Boot
  os aplica programaticamente mesmo com `logback-spring.xml` customizado.
  Campos: timestamp, level, logger, thread, message, e MDC (`correlationId`, `runId`).

### 1.2 Propagação via MDC (thread-local, idiomático SLF4J)
- **`scheduler/AlertaManutencaoScheduler.java`** e
  **`controller/AlertaManutencaoController.java`** (`verificar()`): no início,
  gerar um `runId` (`UUID.randomUUID()`), `MDC.put("runId", runId)`, e limpar em
  `finally`. Os logs já existentes ("Scheduler ... iniciado", "Verificando N
  veiculo(s) ativo(s)" / "Varredura ...") passam a carregar o `runId` — cobrindo
  o requisito "inicia verificação" + "quantos veículos encontrou".
- **`service/ManutencaoPreventivaService.java`**:
  - Em `verificarEAlertar(veiculo)`: no início gerar `correlationId`
    (`UUID.randomUUID()`), `MDC.put("correlationId", id)`, limpar em `finally`
    (essencial — a thread é reutilizada entre veículos).
  - Em `reprocessarPendentes()`: gerar/colocar um `correlationId` novo por
    iteração de alerta, limpando ao fim de cada uma.
- **`service/NotificacaoClient.java`** (`enviarNotificacao`): ler
  `MDC.get("correlationId")` (fallback: gerar um se ausente) e adicionar o header
  `X-Correlation-ID` no `HttpHeaders`. Os logs "Enviando notificacao para ..." e
  "Notificacao enviada: ... status=..." já existem e passam a sair em JSON com o
  `correlationId` — cobrindo "logar quando chamar a api-notificacoes, com status
  da resposta". Usar uma constante para a chave do header.

> Nenhuma assinatura de método muda: o id flui via MDC e só é lido no client.

---

## Parte 2 — rotalog-api-notificacoes (.NET Core 6)

Seguindo a convenção .NET (sem Serilog — usar o `ILogger` nativo + JSON console
embutido, sem novos pacotes).

### 2.1 JSON console + escopos
- **`Program.cs`**: `builder.Logging.ClearProviders();` seguido de
  `builder.Logging.AddJsonConsole(o => o.IncludeScopes = true);`. Respeita os
  níveis de `appsettings.json` (`Logging:LogLevel`). `IncludeScopes` é o que faz
  o `CorrelationId` aparecer em todas as entradas do request.

### 2.2 Middleware de correlation-id
- **Novo `Middleware/CorrelationIdMiddleware.cs`**: lê o header
  `X-Correlation-ID` (gera um GUID se ausente, para robustez), guarda em
  `HttpContext.Items`, opcionalmente devolve no response header, e abre um escopo
  de log `logger.BeginScope(new Dictionary<string,object>{ ["CorrelationId"] = id })`
  envolvendo `await next()`. Como o `IExternalScopeProvider` do ASP.NET Core é
  compartilhado, o escopo aparece em **todos** os loggers durante o request.
- **`Program.cs`**: registrar o middleware antes de `app.MapControllers()`.

### 2.3 Lacunas de log (requisito 3)
- **`Controllers/NotificacoesController.cs`** (`Criar`): adicionar um
  `_logger.LogInformation` no início ("Pedido de notificação recebido: tipo=...,
  destinatário=...") — hoje o primeiro log ("Notificação criada") só ocorre após
  o save. Cobre "quando recebe o pedido".
- **`Services/NotificacaoService.cs`**: "quando tentar enviar email"
  (`[EMAIL FAKE] Enviando para ...` em `EnviarEmail`) e "o resultado do envio"
  ("Notificação enviada ..." no sucesso / `LogError` na falha em `TentarEnviar`)
  **já existem** — passam a sair em JSON com `CorrelationId` automaticamente.
  Nenhuma alteração obrigatória aqui.

---

## Arquivos a modificar

**frotas:** `pom.xml`, novo `src/main/resources/logback-spring.xml`,
`scheduler/AlertaManutencaoScheduler.java`,
`controller/AlertaManutencaoController.java`,
`service/ManutencaoPreventivaService.java`, `service/NotificacaoClient.java`.

**notificacoes:** `Program.cs`, novo `Middleware/CorrelationIdMiddleware.cs`,
`Controllers/NotificacoesController.cs`.

---

## Verificação (ponta a ponta)

1. **Build**: `mvn -q -f rotalog-api-frotas/pom.xml compile` e
   `dotnet build rotalog-api-notificacoes/api-notificacoes.csproj`.
2. Subir o PostgreSQL via `docker-compose` do `rotalog-workspace` e iniciar os
   dois serviços (frotas:8080, notificacoes:5000).
3. Disparar o fluxo: `POST http://localhost:8080/api/alertas-manutencao/verificar`.
4. **Conferir nos logs JSON:**
   - frotas: linha de início + contagem de veículos (com `runId`); por veículo
     que dispara, "Enviando notificacao ..." e o status da resposta (com
     `correlationId`).
   - notificacoes: "Pedido de notificação recebido", "[EMAIL FAKE] Enviando ..."
     e o resultado do envio — todas com o **mesmo** `CorrelationId` que saiu do
     frotas.
   - Validar a correlação pegando um `correlationId` do frotas e confirmando que
     aparece nas entradas correspondentes do notificacoes (header
     `X-Correlation-ID` propagado).
5. Confirmar que cada veículo gera um `correlationId` distinto e que o `runId`
   é o mesmo para toda a varredura.
