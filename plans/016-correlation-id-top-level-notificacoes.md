# Correlation-ID: emitir como campo top-level no api-notificacoes

## Context

No plano 015 foi adicionada observabilidade ao fluxo de alerta de manutenção
(frotas → notificacoes), com um `correlationId` propagado via header
`X-Correlation-ID`. O usuário, comparando os logs, vê o `correlationId` do
frotas **diferente** do id que aparece no topo do log do notificacoes.

**Verificação feita — a propagação HTTP está correta:**
- frotas grava o `correlationId` no MDC por veículo
  ([ManutencaoPreventivaService.java:62-63](../rotalog-api-frotas/src/main/java/com/rotalog/service/ManutencaoPreventivaService.java#L62-L63))
  e o injeta no header em
  [NotificacaoClient.java:65-69](../rotalog-api-frotas/src/main/java/com/rotalog/service/NotificacaoClient.java#L65-L69).
  Toda a cadeia (controller/scheduler → service → client → RestTemplate) roda na
  mesma thread, então o MDC permanece íntegro.
- notificacoes lê o mesmo header em
  [CorrelationIdMiddleware.cs:19-31](../rotalog-api-notificacoes/Middleware/CorrelationIdMiddleware.cs#L19-L31)
  e abre um escopo de log com ele.
- Builds locais estão atualizados (artefatos mais novos que o fonte); execução é
  local (mvn + dotnet), então não é imagem/binário velho.

**Causa raiz (defeito de observabilidade, não de transporte):** os dois serviços
emitem o id em **formatos incompatíveis**.
- **frotas** (LogstashEncoder, `logback-spring.xml`) escreve `correlationId`
  como **campo de topo** no JSON.
- **notificacoes** (`AddJsonConsole` + `BeginScope` em
  [Program.cs:18-19](../rotalog-api-notificacoes/Program.cs#L18-L19)) só emite o id
  **aninhado dentro do array `Scopes[]`**, com a chave PascalCase `CorrelationId`,
  ao lado do `RequestId`/`TraceId` próprios do .NET.

Resultado: o id de topo que aparece no log do notificacoes é o `RequestId` do
ASP.NET — nunca o `correlationId` que o frotas enviou (que está presente, porém
soterrado em `Scopes`). Daí a impressão de "não é o mesmo".

**Objetivo:** fazer o notificacoes emitir o `correlationId` como **campo de topo**
com o mesmo nome do frotas, tornando o id diretamente comparável/grepável ponta a
ponta. Sem novos pacotes (sem Serilog), seguindo a convenção do plano 015.

## Abordagem

`AddJsonConsole` não permite promover um valor de escopo para campo de topo. A
forma idiomática no .NET 6, sem dependências extras, é um **`ConsoleFormatter`
customizado** que lê o `CorrelationId` do escopo ativo (já aberto pelo middleware)
e o escreve no nível raiz do JSON.

### 1. Novo `Logging/CorrelationJsonConsoleFormatter.cs`
- Classe `sealed` herdando de `Microsoft.Extensions.Logging.Console.ConsoleFormatter`,
  registrada com um nome próprio (ex.: `"correlation-json"`).
- Em `Write<TState>(...)`: varrer `scopeProvider.ForEachScope(...)` procurando, nos
  escopos do tipo `IEnumerable<KeyValuePair<string,object>>`, a chave
  `CorrelationId` (a mesma definida no middleware), guardando o último valor.
- Serializar um objeto JSON de uma linha com `System.Text.Json`, com campos
  alinhados ao frotas: `timestamp` (UTC ISO-8601), `level`, `category`
  (`logEntry.Category`), `message` (`logEntry.Formatter(...)`), `correlationId`
  (camelCase, top-level) e, quando houver, `exception`.
- Escrever com `textWriter.WriteLine(...)`.

### 2. `Program.cs` — trocar o provider de log
Substituir [Program.cs:18-19](../rotalog-api-notificacoes/Program.cs#L18-L19):
```csharp
builder.Logging.ClearProviders();
builder.Logging.AddConsole(o => o.FormatterName = "correlation-json");
builder.Logging.AddConsoleFormatter<CorrelationJsonConsoleFormatter, ConsoleFormatterOptions>();
```
Mantém os níveis de `appsettings.json` (`Logging:LogLevel`). O middleware
([Program.cs:82](../rotalog-api-notificacoes/Program.cs#L82)) e o escopo
`CorrelationId` continuam como estão — só muda a forma de renderizar.

> Sem mudanças no frotas: ele já emite `correlationId` top-level corretamente.

## Arquivos a modificar

- **novo** `rotalog-api-notificacoes/Logging/CorrelationJsonConsoleFormatter.cs`
- `rotalog-api-notificacoes/Program.cs` (linhas 18-19)

## Verificação (ponta a ponta)

1. **Build:** `dotnet build rotalog-api-notificacoes/api-notificacoes.csproj`.
2. Subir PostgreSQL (docker-compose do `rotalog-workspace`) e iniciar frotas
   (8080) e notificacoes (5000).
3. Disparar: `POST http://localhost:8080/api/alertas-manutencao/verificar`.
4. Pegar um `correlationId` de uma linha do frotas (campo top-level, ex.: log
   "Enviando notificacao ...").
5. Confirmar nos logs do notificacoes ("Pedido de notificação recebido",
   "[EMAIL FAKE] Enviando ...", resultado do envio) que existe agora um
   **`correlationId` no nível de topo** com **exatamente o mesmo valor** — e que
   já não é preciso olhar dentro de `Scopes`.
6. Confirmar que cada veículo gera um `correlationId` distinto e que ids de
   veículos diferentes não se misturam entre os dois serviços.
