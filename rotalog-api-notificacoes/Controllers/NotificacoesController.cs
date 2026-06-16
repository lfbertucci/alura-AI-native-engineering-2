using Microsoft.AspNetCore.Mvc;
using api_notificacoes.DTOs;
using api_notificacoes.Services;

namespace api_notificacoes.Controllers;

/// <summary>
/// Controller principal de notificações
/// 
/// FIXME: Sem versionamento de API
/// FIXME: Sem rate limiting
/// FIXME: Sem autenticação
/// FIXME: Sem validação com FluentValidation
/// FIXME: Try/catch genérico em todos os endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class NotificacoesController : ControllerBase
{
    private readonly NotificacaoService _service;
    private readonly ILogger<NotificacoesController> _logger;

    // FIXME: Injetando classe concreta em vez de interface
    public NotificacoesController(NotificacaoService service, ILogger<NotificacoesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Listar notificações com filtros opcionais
    /// GET /api/notificacoes?tipo=ENTREGA_CRIADA&status=ENVIADO&canal=email&servicoOrigem=api-entregas
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? tipo,
        [FromQuery] string? status,
        [FromQuery] string? canal,
        [FromQuery] string? servicoOrigem)
    {
        try
        {
            var notificacoes = await _service.ListarNotificacoes(tipo, status, canal, servicoOrigem);
            return Ok(notificacoes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao listar notificações");
            // FIXME: Expondo mensagem de erro interna
            return StatusCode(500, new { error = "Erro ao listar notificações", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Buscar notificação por ID
    /// GET /api/notificacoes/{id}
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarPorId(long id)
    {
        try
        {
            var notificacao = await _service.BuscarPorId(id);
            if (notificacao == null)
                return NotFound(new { error = "Notificação não encontrada" });

            return Ok(notificacao);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao buscar notificação {Id}", id);
            return StatusCode(500, new { error = "Erro ao buscar notificação", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Criar e enviar notificação
    /// POST /api/notificacoes
    /// 
    /// Este é o endpoint principal chamado pelo api-frotas e api-entregas
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] NotificacaoRequest request)
    {
        try
        {
            _logger.LogInformation("Pedido de notificação recebido: tipo={Tipo}, destinatario={Destinatario}",
                request.Tipo, request.Destinatario);

            // FIXME: Validação mínima inline
            if (string.IsNullOrEmpty(request.Tipo))
                return BadRequest(new { error = "Campo 'tipo' é obrigatório" });
            if (string.IsNullOrEmpty(request.Destinatario))
                return BadRequest(new { error = "Campo 'destinatario' é obrigatório" });
            if (string.IsNullOrEmpty(request.Mensagem) && (request.Variaveis == null || request.Variaveis.Count == 0))
                return BadRequest(new { error = "Campo 'mensagem' ou 'variaveis' é obrigatório" });

            var notificacao = await _service.CriarNotificacao(request);
            return CreatedAtAction(nameof(BuscarPorId), new { id = notificacao.Id }, notificacao);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao criar notificação");
            return StatusCode(500, new { error = "Erro ao criar notificação", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Reenviar notificação
    /// POST /api/notificacoes/{id}/reenviar
    /// </summary>
    [HttpPost("{id}/reenviar")]
    public async Task<IActionResult> Reenviar(long id, [FromBody] ReenvioRequest? request)
    {
        try
        {
            var notificacao = await _service.ReenviarNotificacao(id, request);
            if (notificacao == null)
                return NotFound(new { error = "Notificação não encontrada" });

            return Ok(notificacao);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao reenviar notificação {Id}", id);
            return StatusCode(500, new { error = "Erro ao reenviar notificação", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Obter estatísticas de notificações
    /// GET /api/notificacoes/stats
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> Estatisticas()
    {
        try
        {
            var stats = await _service.ObterEstatisticas();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter estatísticas");
            return StatusCode(500, new { error = "Erro ao obter estatísticas", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Listar templates de notificação
    /// GET /api/notificacoes/templates?apenasAtivos=true
    /// </summary>
    [HttpGet("templates")]
    public async Task<IActionResult> ListarTemplates([FromQuery] bool? apenasAtivos)
    {
        try
        {
            var templates = await _service.ListarTemplates(apenasAtivos);
            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao listar templates");
            return StatusCode(500, new { error = "Erro ao listar templates", detalhes = ex.Message });
        }
    }

    /// <summary>
    /// Processar notificações pendentes (batch)
    /// POST /api/notificacoes/processar
    /// 
    /// FIXME: Deveria ser um job agendado, não um endpoint
    /// FIXME: Sem autenticação/autorização
    /// </summary>
    [HttpPost("processar")]
    public async Task<IActionResult> ProcessarPendentes()
    {
        try
        {
            var processadas = await _service.ProcessarPendentes();
            return Ok(new { processadas, timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao processar notificações pendentes");
            return StatusCode(500, new { error = "Erro ao processar pendentes", detalhes = ex.Message });
        }
    }
}
