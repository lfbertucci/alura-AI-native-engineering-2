package com.rotalog.service;

import com.rotalog.domain.Veiculo;
import com.rotalog.service.NotificacaoClient.NotificacaoResultado;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * VeiculoNotificacaoService — centraliza o envio de notificações relacionadas a veículos.
 */
@Slf4j
@Component
public class VeiculoNotificacaoService {

    @Autowired
    private NotificacaoClient notificacaoClient;

    @Value("${rotalog.alerta.destinatario-gestor}")
    private String destinatarioGestor;

    public void notificarNovoVeiculo(Veiculo veiculo) {
        try {
            notificacaoClient.enviarNotificacao(
                "NOVO_VEICULO",
                destinatarioGestor,
                "Novo veiculo cadastrado: " + veiculo.getPlaca() + " - " + veiculo.getModelo()
            );
        } catch (Exception e) {
            log.error("Erro ao enviar notificacao de novo veiculo: {}", e.getMessage());
        }
    }

    /**
     * Overload legado — sem motivo, sem retorno de resultado.
     * Mantido para compatibilidade com chamadas existentes.
     */
    public void notificarAlertaManutencao(Veiculo veiculo, Long km) {
        notificarAlertaManutencao(veiculo, km, null);
    }

    /**
     * Overload principal — inclui motivo (KM ou TEMPO) e retorna o resultado da notificacao.
     * Usado pelo ManutencaoPreventivaService para persistir status e notificacaoId.
     */
    public NotificacaoResultado notificarAlertaManutencao(Veiculo veiculo, Long km, String motivo) {
        String mensagemMotivo = "KM".equals(motivo)
                ? "Veiculo " + veiculo.getPlaca() + " atingiu " + km + " km desde a ultima manutencao. Agendar manutencao preventiva."
                : "Veiculo " + veiculo.getPlaca() + " ultrapassou o intervalo de tempo para manutencao preventiva (km atual: " + km + ").";

        return notificacaoClient.enviarNotificacao(
            "ALERTA_MANUTENCAO",
            destinatarioGestor,
            mensagemMotivo
        );
    }

    public void notificarManutencaoAgendada(Veiculo veiculo, Long kmLimite) {
        try {
            notificacaoClient.enviarNotificacao(
                "MANUTENCAO_AGENDADA",
                destinatarioGestor,
                "Manutencao preventiva agendada para veiculo " + veiculo.getPlaca() + " em " + kmLimite + " km"
            );
        } catch (Exception e) {
            log.error("Falha ao notificar agendamento de manutencao: {}", e.getMessage());
        }
    }

    public void notificarManutencaoAgendada(Veiculo veiculo, String tipoManutencao) {
        try {
            notificacaoClient.enviarNotificacao(
                "MANUTENCAO_AGENDADA",
                destinatarioGestor,
                "Manutencao " + tipoManutencao + " agendada para veiculo " + veiculo.getPlaca()
            );
        } catch (Exception e) {
            log.error("Falha ao notificar agendamento de manutencao: {}", e.getMessage());
        }
    }

    public void notificarDesativacao(Veiculo veiculo) {
        try {
            notificacaoClient.enviarNotificacao(
                "VEICULO_DESATIVADO",
                destinatarioGestor,
                "Veiculo " + veiculo.getPlaca() + " foi desativado"
            );
        } catch (Exception e) {
            log.error("Falha ao notificar desativacao: {}", e.getMessage());
        }
    }
}
