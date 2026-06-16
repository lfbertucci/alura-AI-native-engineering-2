using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api_notificacoes.Models;

/// <summary>
/// Entidade principal de notificação
/// 
/// FIXME: Sem separação entre domain model e persistence model
/// FIXME: Annotations misturadas com lógica de domínio
/// FIXME: Status como string em vez de enum
/// FIXME: Sem audit trail (quem criou, quem alterou)
/// </summary>
[Table("notificacoes", Schema = "notificacoes")]
public class Notificacao
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("tipo")]
    [Required]
    [MaxLength(50)]
    public string Tipo { get; set; } = string.Empty; // FIXME: deveria ser enum

    [Column("canal")]
    [Required]
    [MaxLength(20)]
    public string Canal { get; set; } = "email"; // FIXME: hardcoded default

    [Column("destinatario")]
    [Required]
    [MaxLength(255)]
    public string Destinatario { get; set; } = string.Empty;

    [Column("assunto")]
    [MaxLength(255)]
    public string? Assunto { get; set; }

    [Column("mensagem")]
    [Required]
    public string Mensagem { get; set; } = string.Empty;

    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PENDENTE"; // FIXME: deveria ser enum

    [Column("tentativas")]
    public int Tentativas { get; set; } = 0;

    [Column("max_tentativas")]
    public int MaxTentativas { get; set; } = 3; // FIXME: hardcoded

    [Column("erro_mensagem")]
    public string? ErroMensagem { get; set; }

    [Column("servico_origem")]
    [MaxLength(50)]
    public string? ServicoOrigem { get; set; } // api-frotas, api-entregas

    [Column("referencia_id")]
    [MaxLength(100)]
    public string? ReferenciaId { get; set; } // ID do recurso no serviço de origem

    [Column("data_criacao")]
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    [Column("data_envio")]
    public DateTime? DataEnvio { get; set; }

    [Column("data_atualizacao")]
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;

    // FIXME: Sem navigation properties
    // FIXME: Sem índices definidos via Fluent API
    // FIXME: Sem soft delete
}
