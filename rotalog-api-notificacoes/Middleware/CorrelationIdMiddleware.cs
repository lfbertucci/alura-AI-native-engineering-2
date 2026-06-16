using Microsoft.Extensions.Primitives;

namespace api_notificacoes.Middleware;

public class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-ID";
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue(HeaderName, out StringValues correlationId)
            || string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString();
        }

        context.Items["CorrelationId"] = (string)correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (_logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = (string)correlationId }))
        {
            await _next(context);
        }
    }
}
