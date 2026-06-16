using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api_notificacoes.Models;

/// <summary>
/// Configuração de preferências de notificação por destinatário
/// 
/// FIXME: Sem relação com tabela de usuários (não existe)
/// FIXME: Sem validação de canal
/// FIXME: Tabela criada mas nunca usada de verdade
/// </summary>
[Table("configuracoes_notificacao", Schema = "notificacoes")]
public class ConfiguracaoNotificacao
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("destinatario")]
    [Required]
    [MaxLength(255)]
    public string Destinatario { get; set; } = string.Empty;

    [Column("canal_preferido")]
    [MaxLength(20)]
    public string CanalPreferido { get; set; } = "email";

    [Column("ativo")]
    public bool Ativo { get; set; } = true;

    [Column("receber_email")]
    public bool ReceberEmail { get; set; } = true;

    [Column("receber_sms")]
    public bool ReceberSms { get; set; } = false;

    [Column("receber_push")]
    public bool ReceberPush { get; set; } = false; // FIXME: push não implementado

    [Column("horario_silencioso_inicio")]
    public TimeOnly? HorarioSilenciosoInicio { get; set; }

    [Column("horario_silencioso_fim")]
    public TimeOnly? HorarioSilenciosoFim { get; set; }

    [Column("data_criacao")]
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    // FIXME: Tabela existe mas lógica de preferências não está implementada
    // TODO: Implementar respeito ao horário silencioso
    // TODO: Implementar preferência de canal
}
