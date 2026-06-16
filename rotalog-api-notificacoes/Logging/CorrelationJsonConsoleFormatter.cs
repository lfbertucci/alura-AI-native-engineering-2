using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Logging;

public sealed class CorrelationJsonConsoleFormatter : ConsoleFormatter
{
    public const string FormatterName = "correlation-json";

    public CorrelationJsonConsoleFormatter(IOptionsMonitor<ConsoleFormatterOptions> options)
        : base(FormatterName) { }

    public override void Write<TState>(
        in LogEntry<TState> logEntry,
        IExternalScopeProvider? scopeProvider,
        TextWriter textWriter)
    {
        string? correlationId = null;

        scopeProvider?.ForEachScope((scope, _) =>
        {
            if (scope is IEnumerable<KeyValuePair<string, object>> pairs)
            {
                foreach (var pair in pairs)
                {
                    if (pair.Key == "CorrelationId")
                        correlationId = pair.Value?.ToString();
                }
            }
        }, (object?)null);

        var message = logEntry.Formatter?.Invoke(logEntry.State, logEntry.Exception) ?? string.Empty;

        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            writer.WriteStartObject();
            writer.WriteString("timestamp", DateTimeOffset.UtcNow.ToString("o"));
            writer.WriteString("level", logEntry.LogLevel.ToString());
            writer.WriteString("category", logEntry.Category);
            writer.WriteString("message", message);
            if (correlationId is not null)
                writer.WriteString("correlationId", correlationId);
            if (logEntry.Exception is not null)
                writer.WriteString("exception", logEntry.Exception.ToString());
            writer.WriteEndObject();
        }

        textWriter.WriteLine(System.Text.Encoding.UTF8.GetString(stream.ToArray()));
    }
}
