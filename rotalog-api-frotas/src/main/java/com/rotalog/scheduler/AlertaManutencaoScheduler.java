package com.rotalog.scheduler;

import com.rotalog.domain.Veiculo;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.ManutencaoPreventivaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * AlertaManutencaoScheduler — dispara diariamente a varredura de alertas de manutenção preventiva.
 */
@Slf4j
@Component
public class AlertaManutencaoScheduler {

    @Autowired
    private ManutencaoPreventivaService manutencaoPreventivaService;

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Scheduled(cron = "${rotalog.manutencao.alerta.cron}")
    public void executar() {
        String runId = UUID.randomUUID().toString();
        MDC.put("runId", runId);
        try {
            log.info("Scheduler de alertas de manutencao iniciado.");

            manutencaoPreventivaService.reprocessarPendentes();

            List<Veiculo> veiculosAtivos = veiculoRepository.findByStatus("ATIVO");
            log.info("Verificando {} veiculo(s) ativo(s).", veiculosAtivos.size());

            for (Veiculo veiculo : veiculosAtivos) {
                manutencaoPreventivaService.verificarEAlertar(veiculo);
            }

            log.info("Scheduler de alertas de manutencao concluido.");
        } finally {
            MDC.remove("runId");
        }
    }
}
