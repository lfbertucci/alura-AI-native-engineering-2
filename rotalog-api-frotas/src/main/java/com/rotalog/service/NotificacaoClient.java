package com.rotalog.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * NotificacaoClient — HTTP client para a api-notificacoes.
 *
 * FIXME: Sem circuit breaker
 * FIXME: Sem retry logic
 * FIXME: Sem timeout configurável
 * FIXME: RestTemplate instanciado manualmente em vez de ser Bean
 */
@Slf4j
@Component
public class NotificacaoClient {

    /**
     * Resultado de uma chamada à api-notificacoes.
     * status: ENVIADA | FALHA | PENDENTE
     * notificacaoId: id retornado pelo serviço (null quando PENDENTE/FALHA sem id)
     */
    @Getter
    public static class NotificacaoResultado {
        private final String status;
        private final Long notificacaoId;

        public NotificacaoResultado(String status, Long notificacaoId) {
            this.status = status;
            this.notificacaoId = notificacaoId;
        }
    }

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Value("${rotalog.api.notificacoes.url}")
    private String notificacoesUrl;

    // FIXME: RestTemplate criado manualmente — deveria ser @Bean injetado
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Envia notificação para a api-notificacoes e retorna o resultado.
     * Se o serviço estiver fora do ar (ResourceAccessException ou qualquer falha de conexão),
     * retorna status=PENDENTE sem propagar a exceção (DoD: gravar e reprocessar depois).
     */
    public NotificacaoResultado enviarNotificacao(String tipo, String destinatario, String mensagem) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String correlationId = MDC.get("correlationId");
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }
            headers.set(CORRELATION_ID_HEADER, correlationId);

            Map<String, String> body = new HashMap<>();
            body.put("tipo", tipo);
            body.put("destinatario", destinatario);
            body.put("mensagem", mensagem);
            body.put("canal", "email"); // FIXME: canal hardcoded

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            String url = notificacoesUrl + "/api/notificacoes";

            log.info("Enviando notificacao para {}: tipo={}, destinatario={}", url, tipo, destinatario);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(url, request, (Class<Map<String, Object>>) (Class<?>) Map.class);
            Map<String, Object> responseBody = response.getBody();

            String statusRaw = responseBody != null ? (String) responseBody.get("status") : null;
            Object idObj = responseBody != null ? responseBody.get("id") : null;
            Long notificacaoId = idObj != null ? Long.valueOf(idObj.toString()) : null;

            // Normaliza: api-notificacoes retorna "ENVIADO", o domínio de alertas usa "ENVIADA"
            String statusNormalizado = "ENVIADO".equalsIgnoreCase(statusRaw) ? "ENVIADA" : statusRaw;
            if (statusNormalizado == null) {
                statusNormalizado = "FALHA";
            }

            log.info("Notificacao enviada: tipo={}, status={}, notificacaoId={}", tipo, statusNormalizado, notificacaoId);
            return new NotificacaoResultado(statusNormalizado, notificacaoId);

        } catch (ResourceAccessException e) {
            log.warn("api-notificacoes indisponivel (conexao recusada): tipo={}, erro={}", tipo, e.getMessage());
            return new NotificacaoResultado("PENDENTE", null);
        } catch (Exception e) {
            log.error("Erro ao enviar notificacao: tipo={}, erro={}", tipo, e.getMessage());
            return new NotificacaoResultado("PENDENTE", null);
        }
    }

    /**
     * Envia notificacao SMS.
     *
     * FIXME: Codigo duplicado com enviarNotificacao
     * FIXME: Deveria ser o mesmo metodo com canal diferente
     */
    public void enviarSms(String destinatario, String mensagem) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("tipo", "SMS");
            body.put("destinatario", destinatario);
            body.put("mensagem", mensagem);
            body.put("canal", "sms");

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            String url = notificacoesUrl + "/api/notificacoes";
            restTemplate.postForEntity(url, request, String.class);
        } catch (Exception e) {
            log.error("Erro ao enviar SMS: {}", e.getMessage());
        }
    }
}
