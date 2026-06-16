using api_notificacoes.Data;
using api_notificacoes.DTOs;
using api_notificacoes.Models;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Services;

/// <summary>
/// Serviço principal de notificações
/// 
/// FIXME: God class - faz tudo (CRUD, envio, template, retry)
/// FIXME: Sem interface (impossível mockar para testes)
/// FIXME: Sem separação de responsabilidades
/// FIXME: MediatR configurado mas não usado (Clean Architecture abandonada)
/// FIXME: Lógica de envio fake (simula envio com Thread.Sleep)
/// FIXME: Sem circuit breaker para serviços externos
/// FIXME: Sem dead letter queue
/// </summary>
public class NotificacaoService
{
    private readonly NotificacoesDbContext _context;
    private readonly ILogger<NotificacaoService> _logger;
    private readonly IConfiguration _configuration;

    // FIXME: Sem interface - DI direto na classe concreta
    public NotificacaoService(
        NotificacoesDbContext context,
        ILogger<NotificacaoService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Listar notificações com filtros
    /// FIXME: Sem paginação
    /// FIXME: Sem ordenação configurável
    /// </summary>
    public async Task<List<NotificacaoResponse>> ListarNotificacoes(
        string? tipo = null, string? status = null, string? canal = null, string? servicoOrigem = null)
    {
        var query = _context.Notificacoes.AsQueryable();

        if (!string.IsNullOrEmpty(tipo))
            query = query.Where(n => n.Tipo == tipo);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(n => n.Status == status.ToUpper());

        if (!string.IsNullOrEmpty(canal))
            query = query.Where(n => n.Canal == canal.ToLower());

        if (!string.IsNullOrEmpty(servicoOrigem))
            query = query.Where(n => n.ServicoOrigem == servicoOrigem);

        var notificacoes = await query
            .OrderByDescending(n => n.DataCriacao)
            .ToListAsync(); // FIXME: Sem paginação - carrega tudo

        return notificacoes.Select(MapToResponse).ToList();
    }

    /// <summary>
    /// Buscar notificação por ID
    /// </summary>
    public async Task<NotificacaoResponse?> BuscarPorId(long id)
    {
        var notificacao = await _context.Notificacoes.FindAsync(id);
        return notificacao != null ? MapToResponse(notificacao) : null;
    }

    /// <summary>
    /// Criar e enviar notificação
    /// FIXME: Lógica de criação e envio acoplada
    /// FIXME: Sem validação adequada
    /// </summary>
    public async Task<NotificacaoResponse> CriarNotificacao(NotificacaoRequest request)
    {
        // FIXME: Validação inline - deveria usar FluentValidation
        if (string.IsNullOrEmpty(request.Tipo))
            throw new ArgumentException("Tipo é obrigatório");
        if (string.IsNullOrEmpty(request.Destinatario))
            throw new ArgumentException("Destinatário é obrigatório");

        var mensagemFinal = request.Mensagem;
        var assuntoFinal = request.Assunto;

        // Tentar usar template se existir
        if (request.Variaveis != null && request.Variaveis.Count > 0)
        {
            var template = await _context.Templates
                .FirstOrDefaultAsync(t => t.Tipo == request.Tipo 
                    && t.Canal == (request.Canal ?? "email") 
                    && t.Ativo);

            if (template != null)
            {
                mensagemFinal = AplicarTemplate(template.CorpoTemplate, request.Variaveis);
                if (!string.IsNullOrEmpty(template.AssuntoTemplate))
                    assuntoFinal = AplicarTemplate(template.AssuntoTemplate, request.Variaveis);
            }
        }

        // Se não tem mensagem e não encontrou template, usar a mensagem do request
        if (string.IsNullOrEmpty(mensagemFinal))
            mensagemFinal = request.Mensagem;

        var notificacao = new Notificacao
        {
            Tipo = request.Tipo,
            Canal = request.Canal ?? "email",
            Destinatario = request.Destinatario,
            Assunto = assuntoFinal,
            Mensagem = mensagemFinal,
            Status = "PENDENTE",
            ServicoOrigem = request.ServicoOrigem,
            ReferenciaId = request.ReferenciaId,
            DataCriacao = DateTime.UtcNow,
            DataAtualizacao = DateTime.UtcNow
        };

        _context.Notificacoes.Add(notificacao);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notificação criada: {Id} - Tipo: {Tipo} - Canal: {Canal} - Destinatário: {Dest}",
            notificacao.Id, notificacao.Tipo, notificacao.Canal, notificacao.Destinatario);

        // Tentar enviar imediatamente
        // FIXME: Envio síncrono - deveria ser assíncrono via fila
        await TentarEnviar(notificacao);

        return MapToResponse(notificacao);
    }

    /// <summary>
    /// Reenviar notificação que falhou
    /// FIXME: Sem verificação de max tentativas
    /// </summary>
    public async Task<NotificacaoResponse?> ReenviarNotificacao(long id, ReenvioRequest? request = null)
    {
        var notificacao = await _context.Notificacoes.FindAsync(id);
        if (notificacao == null)
            return null;

        // FIXME: Permite reenviar mesmo se já foi enviada
        if (request?.NovoDestinatario != null)
            notificacao.Destinatario = request.NovoDestinatario;
        if (request?.NovoCanal != null)
            notificacao.Canal = request.NovoCanal;

        notificacao.Status = "PENDENTE";
        notificacao.ErroMensagem = null;
        notificacao.DataAtualizacao = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Tentar enviar novamente
        await TentarEnviar(notificacao);

        return MapToResponse(notificacao);
    }

    /// <summary>
    /// Obter estatísticas de notificações
    /// FIXME: Sem cache
    /// FIXME: Query pesada sem otimização
    /// </summary>
    public async Task<NotificacaoStats> ObterEstatisticas()
    {
        var notificacoes = await _context.Notificacoes.ToListAsync(); // FIXME: Carrega tudo na memória

        var stats = new NotificacaoStats
        {
            Total = notificacoes.Count,
            Enviadas = notificacoes.Count(n => n.Status == "ENVIADO"),
            Pendentes = notificacoes.Count(n => n.Status == "PENDENTE"),
            Falhas = notificacoes.Count(n => n.Status == "FALHA"),
            PorTipo = notificacoes.GroupBy(n => n.Tipo)
                .ToDictionary(g => g.Key, g => g.Count()),
            PorCanal = notificacoes.GroupBy(n => n.Canal)
                .ToDictionary(g => g.Key, g => g.Count()),
            GeradoEm = DateTime.UtcNow
        };

        return stats;
    }

    /// <summary>
    /// Listar templates
    /// </summary>
    public async Task<List<TemplateNotificacao>> ListarTemplates(bool? apenasAtivos = null)
    {
        var query = _context.Templates.AsQueryable();
        if (apenasAtivos == true)
            query = query.Where(t => t.Ativo);
        return await query.OrderBy(t => t.Tipo).ThenBy(t => t.Canal).ToListAsync();
    }

    /// <summary>
    /// Processar notificações pendentes (batch)
    /// FIXME: Sem lock distribuído
    /// FIXME: Sem controle de concorrência
    /// </summary>
    public async Task<int> ProcessarPendentes()
    {
        var pendentes = await _context.Notificacoes
            .Where(n => n.Status == "PENDENTE" && n.Tentativas < n.MaxTentativas)
            .OrderBy(n => n.DataCriacao)
            .Take(50) // FIXME: batch size hardcoded
            .ToListAsync();

        var processadas = 0;
        foreach (var notificacao in pendentes)
        {
            await TentarEnviar(notificacao);
            processadas++;
        }

        _logger.LogInformation("Processadas {Count} notificações pendentes", processadas);
        return processadas;
    }

    /// <summary>
    /// Tentar enviar notificação
    /// FIXME: Envio fake - simula com delay
    /// FIXME: Sem retry com backoff exponencial
    /// FIXME: Sem circuit breaker
    /// </summary>
    protected virtual async Task TentarEnviar(Notificacao notificacao)
    {
        try
        {
            notificacao.Tentativas++;
            notificacao.DataAtualizacao = DateTime.UtcNow;

            // FIXME: Envio fake - simula envio com delay
            if (notificacao.Canal == "email")
            {
                await EnviarEmail(notificacao);
            }
            else if (notificacao.Canal == "sms")
            {
                await EnviarSms(notificacao);
            }
            else
            {
                throw new NotSupportedException($"Canal não suportado: {notificacao.Canal}");
            }

            notificacao.Status = "ENVIADO";
            notificacao.DataEnvio = DateTime.UtcNow;

            _logger.LogInformation("Notificação enviada: {Id} via {Canal} para {Dest}",
                notificacao.Id, notificacao.Canal, notificacao.Destinatario);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao enviar notificação {Id}: {Msg}", notificacao.Id, ex.Message);

            notificacao.ErroMensagem = ex.Message;

            if (notificacao.Tentativas >= notificacao.MaxTentativas)
            {
                notificacao.Status = "FALHA";
                _logger.LogWarning("Notificação {Id} marcada como FALHA após {Tentativas} tentativas",
                    notificacao.Id, notificacao.Tentativas);
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Enviar email (fake)
    /// FIXME: Não envia email de verdade
    /// FIXME: Credenciais SMTP no appsettings.json
    /// </summary>
    protected virtual async Task EnviarEmail(Notificacao notificacao)
    {
        var smtpServer = _configuration["EmailSettings:SmtpServer"];
        var smtpPort = _configuration["EmailSettings:SmtpPort"];
        var senderEmail = _configuration["EmailSettings:SenderEmail"];
        // FIXME: Senha hardcoded no config
        var senderPassword = _configuration["EmailSettings:SenderPassword"];

        _logger.LogInformation("[EMAIL FAKE] Enviando para {Dest} via {Smtp}:{Port}",
            notificacao.Destinatario, smtpServer, smtpPort);
        _logger.LogInformation("[EMAIL FAKE] De: {From} | Assunto: {Subject}",
            senderEmail, notificacao.Assunto);
        _logger.LogInformation("[EMAIL FAKE] Corpo: {Body}", 
            notificacao.Mensagem.Length > 100 
                ? notificacao.Mensagem.Substring(0, 100) + "..." 
                : notificacao.Mensagem);

        // FIXME: Simula delay de envio
        await Task.Delay(100);

        // FIXME: Simula falha aleatória (10% chance)
        if (new Random().Next(10) == 0)
        {
            throw new Exception("SMTP connection timeout (simulated)");
        }
    }

    /// <summary>
    /// Enviar SMS (fake)
    /// FIXME: Não envia SMS de verdade
    /// FIXME: API key hardcoded
    /// </summary>
    protected virtual async Task EnviarSms(Notificacao notificacao)
    {
        var apiKey = _configuration["SmsSettings:ApiKey"];
        var apiUrl = _configuration["SmsSettings:ApiUrl"];

        _logger.LogInformation("[SMS FAKE] Enviando para {Dest} via {Url}",
            notificacao.Destinatario, apiUrl);
        _logger.LogInformation("[SMS FAKE] Mensagem: {Msg}", notificacao.Mensagem);

        // FIXME: Simula delay de envio
        await Task.Delay(50);

        // FIXME: Simula falha aleatória (20% chance para SMS)
        if (new Random().Next(5) == 0)
        {
            throw new Exception("SMS API rate limit exceeded (simulated)");
        }
    }

    /// <summary>
    /// Aplicar variáveis no template
    /// FIXME: String.Replace simples - deveria usar engine de template
    /// FIXME: Sem validação de variáveis obrigatórias
    /// </summary>
    private string AplicarTemplate(string template, Dictionary<string, string> variaveis)
    {
        var resultado = template;
        foreach (var (chave, valor) in variaveis)
        {
            resultado = resultado.Replace("{{" + chave + "}}", valor);
        }
        return resultado;
    }

    /// <summary>
    /// Mapear entidade para DTO de resposta
    /// FIXME: Mapeamento manual - deveria usar AutoMapper
    /// </summary>
    private NotificacaoResponse MapToResponse(Notificacao notificacao)
    {
        return new NotificacaoResponse
        {
            Id = notificacao.Id,
            Tipo = notificacao.Tipo,
            Canal = notificacao.Canal,
            Destinatario = notificacao.Destinatario,
            Assunto = notificacao.Assunto,
            Mensagem = notificacao.Mensagem,
            Status = notificacao.Status,
            Tentativas = notificacao.Tentativas,
            ErroMensagem = notificacao.ErroMensagem,
            ServicoOrigem = notificacao.ServicoOrigem,
            ReferenciaId = notificacao.ReferenciaId,
            DataCriacao = notificacao.DataCriacao,
            DataEnvio = notificacao.DataEnvio
        };
    }
}
