package com.rotalog.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * DTO de resposta para alertas de manutenção preventiva.
 */
@Getter
@AllArgsConstructor
public class AlertaManutencaoResponse {

    private Long id;
    private Long veiculoId;
    private String placa;
    private String modelo;
    private Long quilometragemAlerta;
    private String motivo;
    private LocalDateTime dataAlerta;
    private String statusNotificacao;
}
