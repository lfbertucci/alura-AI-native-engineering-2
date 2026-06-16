package com.rotalog.controller;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.dto.AlertaManutencaoResponse;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.ManutencaoPreventivaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * AlertaManutencaoController — endpoints para consulta e disparo on-demand de alertas de manutenção.
 * Mapeado em /api/alertas-manutencao (context-path /api definido em application.properties).
 */
@Slf4j
@RestController
@RequestMapping("/alertas-manutencao")
public class AlertaManutencaoController {

    @Autowired
    private AlertaManutencaoRepository alertaManutencaoRepository;

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Autowired
    private ManutencaoPreventivaService manutencaoPreventivaService;

    /**
     * GET /api/alertas-manutencao?status=PENDENTE
     * Lista alertas, opcionalmente filtrados por status.
     */
    @GetMapping
    public ResponseEntity<List<AlertaManutencaoResponse>> listar(
            @RequestParam(required = false) String status) {

        List<AlertaManutencao> alertas;
        if (status != null && !status.isBlank()) {
            alertas = alertaManutencaoRepository.findByStatusNotificacaoOrderByDataAlertaDesc(status);
        } else {
            alertas = alertaManutencaoRepository.findAllByOrderByDataAlertaDesc();
        }

        List<AlertaManutencaoResponse> response = toResponseList(alertas);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/alertas-manutencao/verificar
     * Dispara a varredura on-demand em todos os veículos ATIVO e retorna os alertas gerados.
     */
    @PostMapping("/verificar")
    public ResponseEntity<List<AlertaManutencaoResponse>> verificar() {
        String runId = UUID.randomUUID().toString();
        MDC.put("runId", runId);
        try {
            log.info("Varredura on-demand de alertas de manutencao solicitada.");

            manutencaoPreventivaService.reprocessarPendentes();

            List<Veiculo> veiculosAtivos = veiculoRepository.findByStatus("ATIVO");
            List<AlertaManutencao> gerados = new ArrayList<>();

            for (Veiculo veiculo : veiculosAtivos) {
                manutencaoPreventivaService.verificarEAlertar(veiculo)
                        .ifPresent(gerados::add);
            }

            log.info("Varredura concluida: {} alerta(s) gerado(s).", gerados.size());
            return ResponseEntity.ok(toResponseList(gerados));
        } finally {
            MDC.remove("runId");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private List<AlertaManutencaoResponse> toResponseList(List<AlertaManutencao> alertas) {
        List<AlertaManutencaoResponse> lista = new ArrayList<>();
        for (AlertaManutencao alerta : alertas) {
            Optional<Veiculo> veiculoOpt = veiculoRepository.findById(alerta.getVeiculoId());
            String placa = veiculoOpt.map(Veiculo::getPlaca).orElse("N/A");
            String modelo = veiculoOpt.map(Veiculo::getModelo).orElse("N/A");

            lista.add(new AlertaManutencaoResponse(
                    alerta.getId(),
                    alerta.getVeiculoId(),
                    placa,
                    modelo,
                    alerta.getQuilometragemAlerta(),
                    alerta.getMotivo(),
                    alerta.getDataAlerta(),
                    alerta.getStatusNotificacao()
            ));
        }
        return lista;
    }
}
