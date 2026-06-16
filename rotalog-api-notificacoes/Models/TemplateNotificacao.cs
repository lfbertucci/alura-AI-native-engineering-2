using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api_notificacoes.Models;

/// <summary>
/// Templates de notificação para diferentes tipos de evento
/// 
/// FIXME: Templates hardcoded no banco em vez de arquivos
/// FIXME: Sem versionamento de templates
/// FIXME: Sem suporte a i18n
/// FIXME: Variáveis de template como string replace simples
/// </summary>
[Table("templates_notificacao", Schema = "notificacoes")]
public class TemplateNotificacao
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("tipo")]
    [Required]
    [MaxLength(50)]
    public string Tipo { get; set; } = string.Empty;

    [Column("canal")]
    [Required]
    [MaxLength(20)]
    public string Canal { get; set; } = "email";

    [Column("assunto_template")]
    [MaxLength(255)]
    public string? AssuntoTemplate { get; set; }

    [Column("corpo_template")]
    [Required]
    public string CorpoTemplate { get; set; } = string.Empty;

    [Column("ativo")]
    public bool Ativo { get; set; } = true;

    [Column("data_criacao")]
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    [Column("data_atualizacao")]
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;

    // FIXME: Sem validação de variáveis no template
    // FIXME: Sem preview de template
}
