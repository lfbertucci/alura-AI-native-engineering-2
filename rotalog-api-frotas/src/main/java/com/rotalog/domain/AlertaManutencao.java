package com.rotalog.domain;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * AlertaManutencao — registro de alerta de manutenção preventiva disparado para um veículo.
 * Serve também como baseline para o cálculo de próximo disparo (reset dos contadores).
 */
@Entity
@Table(name = "alertas_manutencao")
@Getter
@Setter
@NoArgsConstructor
public class AlertaManutencao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "veiculo_id", nullable = false)
    private Long veiculoId;

    @Column(name = "quilometragem_alerta")
    private Long quilometragemAlerta;

    /** Motivo do disparo: KM ou TEMPO */
    @Column(name = "motivo", length = 20)
    private String motivo;

    @Column(name = "data_alerta")
    private LocalDateTime dataAlerta;

    /** Status da notificação enviada para a api-notificacoes: ENVIADA | FALHA | PENDENTE */
    @Column(name = "status_notificacao", length = 20)
    private String statusNotificacao;

    /** ID da notificação retornado pela api-notificacoes (pode ser null se PENDENTE/FALHA) */
    @Column(name = "notificacao_id")
    private Long notificacaoId;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;
}
