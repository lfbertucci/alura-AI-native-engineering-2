package com.rotalog.service;

import com.rotalog.dto.EstatisticasFrotaResponse;
import com.rotalog.repository.VeiculoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * VeiculoEstatisticasService - Responsável por calcular estatísticas da frota
 */
@Slf4j
@Component
public class VeiculoEstatisticasService {

    @Autowired
    private VeiculoRepository veiculoRepository;

    public EstatisticasFrotaResponse obterEstatisticas() {
        long total = veiculoRepository.count();
        long ativos = veiculoRepository.countByStatus("ATIVO");
        long inativos = veiculoRepository.countByStatus("INATIVO");
        long emManutencao = veiculoRepository.countByStatus("MANUTENCAO");

        log.info("Estatísticas da frota: total={}, ativos={}, inativos={}, emManutencao={}",
                total, ativos, inativos, emManutencao);

        return new EstatisticasFrotaResponse(total, ativos, inativos, emManutencao);
    }
}
