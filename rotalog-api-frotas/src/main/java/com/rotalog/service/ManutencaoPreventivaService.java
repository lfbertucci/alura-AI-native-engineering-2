package com.rotalog.service;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Manutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.ManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.NotificacaoClient.NotificacaoResultado;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * ManutencaoPreventivaService — regras de manutenção preventiva de veículos.
 *
 * Dispara alerta quando KM percorrida desde a baseline >= intervalo-km
 * OU quando tempo desde a baseline >= intervalo-meses (o que vier primeiro).
 * A baseline é o mais recente entre a última manutenção CONCLUIDA e o último alerta disparado.
 * Ao disparar, grava um AlertaManutencao que vira a nova baseline (reset dos contadores).
 */
@Slf4j
@Component
public class ManutencaoPreventivaService {

    @Autowired
    private ManutencaoRepository manutencaoRepository;

    @Autowired
    private AlertaManutencaoRepository alertaManutencaoRepository;

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Autowired
    private VeiculoNotificacaoService notificacaoService;

    @Value("${rotalog.manutencao.intervalo-km:10000}")
    private long intervaloKm;

    @Value("${rotalog.manutencao.intervalo-meses:6}")
    private long intervaloMeses;

    // -------------------------------------------------------------------------
    // API pública
    // -------------------------------------------------------------------------

    /**
     * Verifica se o veículo deve receber um alerta e, em caso positivo, grava o alerta
     * e envia a notificação. Retorna o alerta gravado, ou vazio se não disparou.
     */
    public Optional<AlertaManutencao> verificarEAlertar(Veiculo veiculo) {
        String correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        try {
            AvaliacaoResultado avaliacao = avaliar(veiculo);
            if (!avaliacao.deveDisparar) {
                log.debug("Veiculo {} nao precisa de alerta de manutencao no momento.", veiculo.getPlaca());
                return Optional.empty();
            }

            log.info("Disparando alerta de manutencao para veiculo {} por motivo={}", veiculo.getPlaca(), avaliacao.motivo);

            // (1) Grava com PENDENTE — a baseline fica registrada mesmo se a notificacao falhar
            AlertaManutencao alerta = new AlertaManutencao();
            alerta.setVeiculoId(veiculo.getId());
            alerta.setQuilometragemAlerta(veiculo.getQuilometragem());
            alerta.setMotivo(avaliacao.motivo);
            alerta.setDataAlerta(LocalDateTime.now());
            alerta.setStatusNotificacao("PENDENTE");
            alerta.setDataCriacao(LocalDateTime.now());
            alerta = alertaManutencaoRepository.save(alerta);

            // (2) Envia notificacao
            NotificacaoResultado resultado = notificacaoService.notificarAlertaManutencao(
                    veiculo, veiculo.getQuilometragem(), avaliacao.motivo);

            // (3) Atualiza status e id
            alerta.setStatusNotificacao(resultado.getStatus());
            alerta.setNotificacaoId(resultado.getNotificacaoId());
            alerta = alertaManutencaoRepository.save(alerta);

            log.info("Alerta id={} gravado com statusNotificacao={} para veiculo {}",
                    alerta.getId(), alerta.getStatusNotificacao(), veiculo.getPlaca());

            return Optional.of(alerta);
        } finally {
            MDC.remove("correlationId");
        }
    }

    /**
     * Reenvia alertas com status PENDENTE ou FALHA.
     * Usado pelo scheduler para recuperar quando a api-notificacoes voltar.
     */
    public void reprocessarPendentes() {
        List<AlertaManutencao> pendentes = alertaManutencaoRepository
                .findByStatusNotificacaoIn(Arrays.asList("PENDENTE", "FALHA"));

        if (pendentes.isEmpty()) {
            log.debug("Nenhum alerta pendente para reprocessar.");
            return;
        }

        log.info("Reprocessando {} alerta(s) pendente(s)/falha...", pendentes.size());

        for (AlertaManutencao alerta : pendentes) {
            String correlationId = UUID.randomUUID().toString();
            MDC.put("correlationId", correlationId);
            try {
                Optional<Veiculo> veiculoOpt = veiculoRepository.findById(alerta.getVeiculoId());
                if (veiculoOpt.isEmpty()) {
                    log.warn("Veiculo id={} nao encontrado para alerta id={}", alerta.getVeiculoId(), alerta.getId());
                    continue;
                }
                Veiculo veiculo = veiculoOpt.get();

                NotificacaoResultado resultado = notificacaoService.notificarAlertaManutencao(
                        veiculo, alerta.getQuilometragemAlerta(), alerta.getMotivo());

                alerta.setStatusNotificacao(resultado.getStatus());
                alerta.setNotificacaoId(resultado.getNotificacaoId());
                alertaManutencaoRepository.save(alerta);

                log.info("Alerta id={} reprocessado: statusNotificacao={}", alerta.getId(), resultado.getStatus());
            } finally {
                MDC.remove("correlationId");
            }
        }
    }

    /**
     * Calcula custo estimado de manutenção com base no modelo e na quilometragem.
     */
    public Double calcularCustoManutencao(String modelo, Long quilometragem) {
        Double custoPorKm = 0.05;
        Double custoBase = 500.0;
        return custoBase + (quilometragem * custoPorKm);
    }

    // -------------------------------------------------------------------------
    // Lógica interna
    // -------------------------------------------------------------------------

    private AvaliacaoResultado avaliar(Veiculo veiculo) {
        Baseline baseline = resolverBaseline(veiculo);

        long kmAtual = veiculo.getQuilometragem() != null ? veiculo.getQuilometragem() : 0L;
        long kmPercorrido = kmAtual - baseline.km;
        long mesesDecorridos = ChronoUnit.MONTHS.between(baseline.data, LocalDateTime.now());

        log.debug("Veiculo {}: kmPercorrido={}, mesesDecorridos={}, intervaloKm={}, intervaloMeses={}",
                veiculo.getPlaca(), kmPercorrido, mesesDecorridos, intervaloKm, intervaloMeses);

        if (kmPercorrido >= intervaloKm) {
            return new AvaliacaoResultado(true, "KM");
        }
        if (mesesDecorridos >= intervaloMeses) {
            return new AvaliacaoResultado(true, "TEMPO");
        }
        return new AvaliacaoResultado(false, null);
    }

    /**
     * Resolve a baseline: mais recente entre última manutenção CONCLUIDA e último alerta.
     * Fallback: km=0, data=veiculo.dataCadastro.
     */
    private Baseline resolverBaseline(Veiculo veiculo) {
        LocalDateTime dataFallback = veiculo.getDataCadastro() != null
                ? veiculo.getDataCadastro()
                : LocalDateTime.now().minusYears(10);

        // Última manutenção CONCLUIDA
        Manutencao ultimaManutencao = manutencaoRepository.findUltimaManutencaoConcluida(veiculo.getId());
        LocalDateTime dataManutencao = ultimaManutencao != null ? ultimaManutencao.getDataManutencao() : null;
        long kmManutencao = (ultimaManutencao != null && ultimaManutencao.getQuilometragemManutencao() != null)
                ? ultimaManutencao.getQuilometragemManutencao() : 0L;

        // Último alerta disparado
        Optional<AlertaManutencao> ultimoAlertaOpt = alertaManutencaoRepository
                .findFirstByVeiculoIdOrderByDataAlertaDesc(veiculo.getId());
        LocalDateTime dataAlerta = ultimoAlertaOpt.map(AlertaManutencao::getDataAlerta).orElse(null);
        long kmAlerta = ultimoAlertaOpt
                .map(a -> a.getQuilometragemAlerta() != null ? a.getQuilometragemAlerta() : 0L)
                .orElse(0L);

        // Mais recente entre manutenção e alerta
        if (dataManutencao == null && dataAlerta == null) {
            return new Baseline(0L, dataFallback);
        }
        if (dataManutencao == null) {
            return new Baseline(kmAlerta, dataAlerta);
        }
        if (dataAlerta == null) {
            return new Baseline(kmManutencao, dataManutencao);
        }
        // Ambos existem: usa o mais recente
        if (dataAlerta.isAfter(dataManutencao)) {
            return new Baseline(kmAlerta, dataAlerta);
        }
        return new Baseline(kmManutencao, dataManutencao);
    }

    // -------------------------------------------------------------------------
    // Tipos auxiliares internos
    // -------------------------------------------------------------------------

    private static class Baseline {
        final long km;
        final LocalDateTime data;

        Baseline(long km, LocalDateTime data) {
            this.km = km;
            this.data = data;
        }
    }

    private static class AvaliacaoResultado {
        final boolean deveDisparar;
        final String motivo;

        AvaliacaoResultado(boolean deveDisparar, String motivo) {
            this.deveDisparar = deveDisparar;
            this.motivo = motivo;
        }
    }
}
