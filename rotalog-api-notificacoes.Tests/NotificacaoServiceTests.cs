using api_notificacoes.Data;
using api_notificacoes.DTOs;
using api_notificacoes.Models;
using api_notificacoes.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace rotalog_api_notificacoes.Tests;

// ---------------------------------------------------------------------------
// Subclasses testáveis
// ---------------------------------------------------------------------------

/// <summary>
/// Subclasse que sobrescreve os métodos de envio para sempre ter sucesso,
/// eliminando a falha aleatória presente no serviço real.
/// </summary>
internal class NotificacaoServiceEnvioSempre : NotificacaoService
{
    public NotificacaoServiceEnvioSempre(
        NotificacoesDbContext context,
        ILogger<NotificacaoService> logger,
        IConfiguration configuration)
        : base(context, logger, configuration) { }

    protected override Task EnviarEmail(Notificacao notificacao) => Task.CompletedTask;
    protected override Task EnviarSms(Notificacao notificacao) => Task.CompletedTask;
}

/// <summary>
/// Subclasse que força FALHA no envio: define MaxTentativas=1 e lança exceção,
/// fazendo com que a lógica de TentarEnviar marque Status = "FALHA".
/// </summary>
internal class NotificacaoServiceEnvioFalha : NotificacaoService
{
    public NotificacaoServiceEnvioFalha(
        NotificacoesDbContext context,
        ILogger<NotificacaoService> logger,
        IConfiguration configuration)
        : base(context, logger, configuration) { }

    protected override Task EnviarEmail(Notificacao notificacao)
        => throw new InvalidOperationException("Falha de SMTP simulada para teste");

    protected override Task EnviarSms(Notificacao notificacao)
        => throw new InvalidOperationException("Falha de SMS simulada para teste");

    protected override async Task TentarEnviar(Notificacao notificacao)
    {
        // Garante que a primeira tentativa já esgote o limite para marcar FALHA
        notificacao.MaxTentativas = 1;
        await base.TentarEnviar(notificacao);
    }
}

// ---------------------------------------------------------------------------
// Fábrica de dependências de teste
// ---------------------------------------------------------------------------

public class NotificacaoServiceTests
{
    private static NotificacoesDbContext CriarContextoInMemory(string nomeBanco)
    {
        var options = new DbContextOptionsBuilder<NotificacoesDbContext>()
            .UseInMemoryDatabase(nomeBanco)
            .Options;
        return new NotificacoesDbContext(options);
    }

    private static IConfiguration CriarConfiguracao()
    {
        var pares = new Dictionary<string, string?>
        {
            ["EmailSettings:SmtpServer"] = "smtp.test.local",
            ["EmailSettings:SmtpPort"] = "587",
            ["EmailSettings:SenderEmail"] = "noreply@rotalog.com",
            ["EmailSettings:SenderPassword"] = "senha-teste",
            ["SmsSettings:ApiKey"] = "chave-teste",
            ["SmsSettings:ApiUrl"] = "https://sms.test.local/api"
        };
        return new ConfigurationBuilder().AddInMemoryCollection(pares).Build();
    }

    private static ILogger<NotificacaoService> CriarLogger()
        => new Mock<ILogger<NotificacaoService>>().Object;

    // -------------------------------------------------------------------------
    // Teste 1: Status é ENVIADO ou FALHA (nunca null/vazio) e Id é gerado
    // -------------------------------------------------------------------------
    [Fact]
    public async Task CriarNotificacao_AlertaManutencao_RetornaStatusPreenchido()
    {
        // Arrange
        var contexto = CriarContextoInMemory("Teste1_AlertaManutencao");
        var servico = new NotificacaoServiceEnvioSempre(contexto, CriarLogger(), CriarConfiguracao());

        var request = new NotificacaoRequest
        {
            Tipo = "ALERTA_MANUTENCAO",
            Canal = "email",
            Destinatario = "gestor@rotalog.com",
            Mensagem = "Veículo ABC1D23 precisa de manutenção preventiva (TEMPO)...",
            ServicoOrigem = "api-frotas"
        };

        // Act
        var resultado = await servico.CriarNotificacao(request);

        // Assert
        Assert.NotNull(resultado);
        Assert.True(resultado.Id > 0, "Id deve ser gerado (maior que zero)");
        Assert.False(string.IsNullOrEmpty(resultado.Status), "Status não deve ser null ou vazio");
        Assert.True(
            resultado.Status == "ENVIADO" || resultado.Status == "FALHA",
            $"Status deve ser ENVIADO ou FALHA, mas foi '{resultado.Status}'");
    }

    // -------------------------------------------------------------------------
    // Teste 2: Variáveis no template são substituídas na mensagem final
    // -------------------------------------------------------------------------
    [Fact]
    public async Task CriarNotificacao_ComVariaveis_AplicaTemplate()
    {
        // Arrange
        var contexto = CriarContextoInMemory("Teste2_ComVariaveis");

        // Seed do template com variável {{placa}}
        contexto.Templates.Add(new TemplateNotificacao
        {
            Tipo = "ALERTA_MANUTENCAO",
            Canal = "email",
            AssuntoTemplate = "ALERTA: Veículo {{placa}}",
            CorpoTemplate = "O veículo {{placa}} precisa de manutenção preventiva.",
            Ativo = true
        });
        await contexto.SaveChangesAsync();

        var servico = new NotificacaoServiceEnvioSempre(contexto, CriarLogger(), CriarConfiguracao());

        var request = new NotificacaoRequest
        {
            Tipo = "ALERTA_MANUTENCAO",
            Canal = "email",
            Destinatario = "gestor@rotalog.com",
            Mensagem = "Mensagem padrão (não deve aparecer quando template é encontrado)",
            ServicoOrigem = "api-frotas",
            Variaveis = new Dictionary<string, string>
            {
                ["placa"] = "ABC1D23"
            }
        };

        // Act
        var resultado = await servico.CriarNotificacao(request);

        // Assert: o valor da variável deve aparecer na mensagem após substituição
        Assert.NotNull(resultado);
        Assert.Contains("ABC1D23", resultado.Mensagem);
    }

    // -------------------------------------------------------------------------
    // Teste 3: Campos Tipo e ServicoOrigem persistem corretamente
    // -------------------------------------------------------------------------
    [Fact]
    public async Task CriarNotificacao_PersisteCamposCorretamente()
    {
        // Arrange
        var contexto = CriarContextoInMemory("Teste3_PersisteCampos");
        var servico = new NotificacaoServiceEnvioSempre(contexto, CriarLogger(), CriarConfiguracao());

        var request = new NotificacaoRequest
        {
            Tipo = "ALERTA_MANUTENCAO",
            Canal = "email",
            Destinatario = "gestor@rotalog.com",
            Mensagem = "Veículo ABC1D23 precisa de manutenção preventiva.",
            ServicoOrigem = "api-frotas"
        };

        // Act
        var resultado = await servico.CriarNotificacao(request);

        // Assert via ListarNotificacoes
        var lista = await servico.ListarNotificacoes(tipo: "ALERTA_MANUTENCAO", servicoOrigem: "api-frotas");
        Assert.NotEmpty(lista);

        var notificacaoPersistida = lista.First(n => n.Id == resultado.Id);
        Assert.Equal("ALERTA_MANUTENCAO", notificacaoPersistida.Tipo);
        Assert.Equal("api-frotas", notificacaoPersistida.ServicoOrigem);

        // Confirma diretamente no DbContext InMemory
        var entidade = await contexto.Notificacoes.FindAsync(resultado.Id);
        Assert.NotNull(entidade);
        Assert.Equal("ALERTA_MANUTENCAO", entidade!.Tipo);
        Assert.Equal("api-frotas", entidade.ServicoOrigem);
    }

    // -------------------------------------------------------------------------
    // Teste 4: Quando o envio falha, Status deve ser FALHA
    // -------------------------------------------------------------------------
    [Fact]
    public async Task CriarNotificacao_QuandoEnvioFalha_MarcaStatusFalha()
    {
        // Arrange
        var contexto = CriarContextoInMemory("Teste4_EnvioFalha");
        var servico = new NotificacaoServiceEnvioFalha(contexto, CriarLogger(), CriarConfiguracao());

        var request = new NotificacaoRequest
        {
            Tipo = "ALERTA_MANUTENCAO",
            Canal = "email",
            Destinatario = "gestor@rotalog.com",
            Mensagem = "Veículo ABC1D23 precisa de manutenção preventiva.",
            ServicoOrigem = "api-frotas"
        };

        // Act
        var resultado = await servico.CriarNotificacao(request);

        // Assert
        Assert.NotNull(resultado);
        Assert.Equal("FALHA", resultado.Status);
    }
}
