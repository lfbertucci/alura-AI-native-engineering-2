using Microsoft.EntityFrameworkCore;
using api_notificacoes.Models;

namespace api_notificacoes.Data;

/// <summary>
/// DbContext para o schema de notificações
/// 
/// FIXME: Sem configuração via Fluent API (apenas Data Annotations)
/// FIXME: Sem interceptors para audit trail
/// FIXME: Sem query filters para soft delete
/// FIXME: Sem connection resiliency
/// FIXME: Schema hardcoded
/// </summary>
public class NotificacoesDbContext : DbContext
{
    public NotificacoesDbContext(DbContextOptions<NotificacoesDbContext> options)
        : base(options)
    {
    }

    public DbSet<Notificacao> Notificacoes { get; set; } = null!;
    public DbSet<TemplateNotificacao> Templates { get; set; } = null!;
    public DbSet<ConfiguracaoNotificacao> Configuracoes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // FIXME: Schema hardcoded
        modelBuilder.HasDefaultSchema("notificacoes");

        // FIXME: Sem índices configurados via Fluent API
        // FIXME: Sem configuração de relacionamentos
        // FIXME: Sem seed data via EF Core (feito via SQL)
        // TODO: Adicionar índice em Notificacao.Status
        // TODO: Adicionar índice em Notificacao.Tipo
        // TODO: Adicionar índice em Notificacao.DataCriacao
        // TODO: Adicionar unique constraint em Template (Tipo + Canal)
    }
}
