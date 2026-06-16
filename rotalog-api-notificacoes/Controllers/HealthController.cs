using Microsoft.AspNetCore.Mvc;
using api_notificacoes.Data;
using Npgsql;

namespace api_notificacoes.Controllers;

/// <summary>
/// Health Check Controller
/// 
/// FIXME: Deveria usar IHealthCheck do ASP.NET Core
/// FIXME: Acessa schemas de outros serviços diretamente (violação de bounded context)
/// FIXME: Sem cache de health check
/// FIXME: Expõe detalhes internos da infraestrutura
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly NotificacoesDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        NotificacoesDbContext context,
        IConfiguration configuration,
        ILogger<HealthController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Health check simples
    /// GET /api/health
    /// </summary>
    [HttpGet("/api/health")]
    public async Task<IActionResult> Health()
    {
        var dbStatus = "UNKNOWN";
        var frotasDbStatus = "UNKNOWN";
        var entregasDbStatus = "UNKNOWN";

        // Verificar conexão com o banco (schema notificacoes)
        try
        {
            await _context.Database.CanConnectAsync();
            dbStatus = "UP";
        }
        catch (Exception ex)
        {
            dbStatus = "DOWN";
            _logger.LogError(ex, "Database health check failed");
        }

        // FIXME: Acessando schema de outro serviço diretamente!
        // FIXME: Violação de bounded context - deveria chamar API
        try
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            using var conn = new NpgsqlConnection(connectionString!.Replace("SearchPath=notificacoes", "SearchPath=frotas"));
            await conn.OpenAsync();
            using var cmd = new NpgsqlCommand("SELECT COUNT(*) FROM frotas.veiculos", conn);
            var count = await cmd.ExecuteScalarAsync();
            frotasDbStatus = $"UP (veiculos: {count})"; // FIXME: Expondo contagem
        }
        catch (Exception ex)
        {
            frotasDbStatus = "DOWN";
            _logger.LogWarning("Frotas DB check failed: {Msg}", ex.Message);
        }

        // FIXME: Acessando schema de outro serviço diretamente!
        try
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            using var conn = new NpgsqlConnection(connectionString!.Replace("SearchPath=notificacoes", "SearchPath=entregas"));
            await conn.OpenAsync();
            using var cmd = new NpgsqlCommand("SELECT COUNT(*) FROM entregas.entregas", conn);
            var count = await cmd.ExecuteScalarAsync();
            entregasDbStatus = $"UP (entregas: {count})"; // FIXME: Expondo contagem
        }
        catch (Exception ex)
        {
            entregasDbStatus = "DOWN";
            _logger.LogWarning("Entregas DB check failed: {Msg}", ex.Message);
        }

        return Ok(new
        {
            service = "api-notificacoes",
            status = dbStatus == "UP" ? "UP" : "DEGRADED",
            timestamp = DateTime.UtcNow,
            version = "1.0.0", // FIXME: hardcoded
            dependencies = new
            {
                database = dbStatus,
                frotas_db = frotasDbStatus, // FIXME: Não deveria acessar diretamente
                entregas_db = entregasDbStatus // FIXME: Não deveria acessar diretamente
            },
            configuration = new
            {
                // FIXME: Expondo configuração interna
                smtpServer = _configuration["EmailSettings:SmtpServer"],
                smsApiUrl = _configuration["SmsSettings:ApiUrl"]
            }
        });
    }
}
