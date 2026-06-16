package com.rotalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * DTO de resposta para estatísticas da frota
 */
@Getter
@AllArgsConstructor
public class EstatisticasFrotaResponse {

    private long total;
    private long ativos;
    private long inativos;

    @JsonProperty("em_manutencao")
    private long emManutencao;
}
