package com.rotalog.service;

import com.rotalog.domain.Veiculo;
import com.rotalog.service.NotificacaoClient.NotificacaoResultado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VeiculoNotificacaoService - Testes Unitarios")
class VeiculoNotificacaoServiceTest {

    @Mock
    private NotificacaoClient notificacaoClient;

    @InjectMocks
    private VeiculoNotificacaoService notificacaoService;

    private Veiculo veiculo;

    private static final NotificacaoResultado RESULTADO_ENVIADA = new NotificacaoResultado("ENVIADA", 1L);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(notificacaoService, "destinatarioGestor", "gestor@rotalog.com");

        veiculo = new Veiculo();
        veiculo.setId(1L);
        veiculo.setPlaca("ABC1234");
        veiculo.setModelo("Caminhao Volvo");
    }

    // ==================== notificarNovoVeiculo ====================

    @Test
    @DisplayName("notificarNovoVeiculo: sucesso - envia com tipo NOVO_VEICULO")
    void notificarNovoVeiculo_sucesso_enviaTipoCorreto() {
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(RESULTADO_ENVIADA);

        notificacaoService.notificarNovoVeiculo(veiculo);

        verify(notificacaoClient).enviarNotificacao(eq("NOVO_VEICULO"), anyString(), anyString());
    }

    @Test
    @DisplayName("notificarNovoVeiculo: excecao no client - nao propaga")
    void notificarNovoVeiculo_excecaoNoClient_naoPropaga() {
        doThrow(new RuntimeException("Falha de conexao"))
                .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> notificacaoService.notificarNovoVeiculo(veiculo));
    }

    // ==================== notificarAlertaManutencao ====================

    @Test
    @DisplayName("notificarAlertaManutencao: sucesso - envia com tipo ALERTA_MANUTENCAO")
    void notificarAlertaManutencao_sucesso_enviaTipoCorreto() {
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(RESULTADO_ENVIADA);

        notificacaoService.notificarAlertaManutencao(veiculo, 60000L);

        verify(notificacaoClient).enviarNotificacao(eq("ALERTA_MANUTENCAO"), anyString(), anyString());
    }

    @Test
    @DisplayName("notificarAlertaManutencao: client retorna PENDENTE - nao propaga excecao")
    void notificarAlertaManutencao_clientRetornaPendente_naoPropaga() {
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(new NotificacaoResultado("PENDENTE", null));

        assertDoesNotThrow(() -> notificacaoService.notificarAlertaManutencao(veiculo, 60000L));
    }

    // ==================== notificarManutencaoAgendada ====================

    @Test
    @DisplayName("notificarManutencaoAgendada: sucesso - envia com tipo MANUTENCAO_AGENDADA")
    void notificarManutencaoAgendada_sucesso_enviaTipoCorreto() {
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(RESULTADO_ENVIADA);

        notificacaoService.notificarManutencaoAgendada(veiculo, 70000L);

        verify(notificacaoClient).enviarNotificacao(eq("MANUTENCAO_AGENDADA"), anyString(), anyString());
    }

    @Test
    @DisplayName("notificarManutencaoAgendada: excecao no client - nao propaga")
    void notificarManutencaoAgendada_excecaoNoClient_naoPropaga() {
        doThrow(new RuntimeException("Servico indisponivel"))
                .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> notificacaoService.notificarManutencaoAgendada(veiculo, 70000L));
    }

    // ==================== notificarDesativacao ====================

    @Test
    @DisplayName("notificarDesativacao: sucesso - envia com tipo VEICULO_DESATIVADO")
    void notificarDesativacao_sucesso_enviaTipoCorreto() {
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(RESULTADO_ENVIADA);

        notificacaoService.notificarDesativacao(veiculo);

        verify(notificacaoClient).enviarNotificacao(eq("VEICULO_DESATIVADO"), anyString(), anyString());
    }

    @Test
    @DisplayName("notificarDesativacao: excecao no client - nao propaga")
    void notificarDesativacao_excecaoNoClient_naoPropaga() {
        doThrow(new RuntimeException("Erro interno"))
                .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> notificacaoService.notificarDesativacao(veiculo));
    }
}
