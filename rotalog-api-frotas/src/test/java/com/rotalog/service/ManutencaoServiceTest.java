package com.rotalog.service;

import com.rotalog.domain.Manutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.repository.ManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManutencaoService - Testes Unitarios")
class ManutencaoServiceTest {

    @Mock
    private ManutencaoRepository manutencaoRepository;

    @Mock
    private VeiculoRepository veiculoRepository;

    @Mock
    private NotificacaoClient notificacaoClient;

    @InjectMocks
    private ManutencaoService service;

    private Veiculo veiculo;

    @BeforeEach
    void setUp() {
        veiculo = new Veiculo();
        veiculo.setId(1L);
        veiculo.setPlaca("ABC1234");
        veiculo.setModelo("Caminhao Volvo");
        veiculo.setQuilometragem(50000L);
        veiculo.setStatus("ATIVO");
    }

    // -------------------------------------------------------------------------
    // agendarManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("agendarManutencao: sucesso - salva com status PENDENTE, km do veiculo e notifica MANUTENCAO_AGENDADA")
    void agendarManutencao_sucesso_salvaPendenteComKmENotifica() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));

        Manutencao salva = new Manutencao();
        salva.setId(10L);
        salva.setStatus("PENDENTE");
        when(manutencaoRepository.save(any(Manutencao.class))).thenReturn(salva);
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(new NotificacaoClient.NotificacaoResultado("ENVIADA", 1L));

        Manutencao resultado = service.agendarManutencao(1L, "PREVENTIVA", "Revisao geral", new BigDecimal("1500.00"));

        ArgumentCaptor<Manutencao> captor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(captor.capture());
        Manutencao capturada = captor.getValue();

        assertEquals("PENDENTE", capturada.getStatus());
        assertEquals(50000L, capturada.getQuilometragemManutencao());
        assertEquals("PREVENTIVA", capturada.getTipoManutencao());
        assertNotNull(capturada.getDataCriacao());
        assertNotNull(resultado);

        verify(notificacaoClient).enviarNotificacao(
                eq("MANUTENCAO_AGENDADA"),
                anyString(),
                contains("PREVENTIVA")
        );
    }

    @Test
    @DisplayName("agendarManutencao: veiculo inexistente - lanca RuntimeException")
    void agendarManutencao_veiculoInexistente_lancaRuntimeException() {
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.agendarManutencao(99L, "PREVENTIVA", "desc", null));

        assertTrue(ex.getMessage().contains("99"));
        verify(manutencaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("agendarManutencao: tipoManutencao nulo - lanca RuntimeException")
    void agendarManutencao_tipoManutencaoNulo_lancaRuntimeException() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));

        assertThrows(RuntimeException.class,
                () -> service.agendarManutencao(1L, null, "desc", null));

        verify(manutencaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("agendarManutencao: tipoManutencao vazio - lanca RuntimeException")
    void agendarManutencao_tipoManutencaoVazio_lancaRuntimeException() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));

        assertThrows(RuntimeException.class,
                () -> service.agendarManutencao(1L, "   ", "desc", null));

        verify(manutencaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("agendarManutencao: falha do notificacaoClient nao propaga excecao")
    void agendarManutencao_falhaNotificacao_naoPropagaExcecao() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));

        Manutencao salva = new Manutencao();
        salva.setId(11L);
        when(manutencaoRepository.save(any(Manutencao.class))).thenReturn(salva);
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Timeout de conexao"));

        assertDoesNotThrow(() -> service.agendarManutencao(1L, "CORRETIVA", "desc", null));
        verify(manutencaoRepository).save(any());
    }

    // -------------------------------------------------------------------------
    // iniciarManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("iniciarManutencao: status PENDENTE - transiciona para EM_ANDAMENTO e veiculo para MANUTENCAO")
    void iniciarManutencao_pendente_transicionaParaEmAndamentoEVeiculoParaManutencao() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));

        service.iniciarManutencao(1L);

        ArgumentCaptor<Manutencao> manutencaoCaptor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(manutencaoCaptor.capture());
        assertEquals("EM_ANDAMENTO", manutencaoCaptor.getValue().getStatus());
        assertNotNull(manutencaoCaptor.getValue().getDataManutencao());

        ArgumentCaptor<Veiculo> veiculoCaptor = ArgumentCaptor.forClass(Veiculo.class);
        verify(veiculoRepository).save(veiculoCaptor.capture());
        assertEquals("MANUTENCAO", veiculoCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("iniciarManutencao: status diferente de PENDENTE - ainda transiciona (apenas loga warn)")
    void iniciarManutencao_naoEstaPendente_aindaTransiciona() {
        Manutencao manutencao = new Manutencao();
        manutencao.setId(2L);
        manutencao.setVeiculoId(1L);
        manutencao.setStatus("CONCLUIDA");
        when(manutencaoRepository.findById(2L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));

        service.iniciarManutencao(2L);

        ArgumentCaptor<Manutencao> captor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(captor.capture());
        assertEquals("EM_ANDAMENTO", captor.getValue().getStatus());
    }

    // -------------------------------------------------------------------------
    // concluirManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("concluirManutencao: sucesso - status CONCLUIDA, aplica custoFinal, reativa veiculo e notifica")
    void concluirManutencao_sucesso_concluidaComCustoFinalENotifica() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        manutencao.setCusto(new BigDecimal("500.00"));
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(new NotificacaoClient.NotificacaoResultado("ENVIADA", 2L));

        service.concluirManutencao(1L, new BigDecimal("1200.00"));

        ArgumentCaptor<Manutencao> manutencaoCaptor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(manutencaoCaptor.capture());
        assertEquals("CONCLUIDA", manutencaoCaptor.getValue().getStatus());
        assertEquals(new BigDecimal("1200.00"), manutencaoCaptor.getValue().getCusto());

        ArgumentCaptor<Veiculo> veiculoCaptor = ArgumentCaptor.forClass(Veiculo.class);
        verify(veiculoRepository).save(veiculoCaptor.capture());
        assertEquals("ATIVO", veiculoCaptor.getValue().getStatus());

        verify(notificacaoClient).enviarNotificacao(eq("MANUTENCAO_CONCLUIDA"), anyString(), anyString());
    }

    @Test
    @DisplayName("concluirManutencao: custoFinal nulo - mantém custo anterior sem sobrescrever")
    void concluirManutencao_custoFinalNulo_mantemCustoExistente() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        manutencao.setCusto(new BigDecimal("800.00"));
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(new NotificacaoClient.NotificacaoResultado("ENVIADA", 3L));

        service.concluirManutencao(1L, null);

        ArgumentCaptor<Manutencao> captor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(captor.capture());
        assertEquals("CONCLUIDA", captor.getValue().getStatus());
        assertEquals(new BigDecimal("800.00"), captor.getValue().getCusto());
    }

    @Test
    @DisplayName("concluirManutencao: veiculo nulo - usa placa N/A sem lancar excecao")
    void concluirManutencao_veiculoNulo_usaPlacaNaSemExcecao() {
        Manutencao manutencao = manutencaoPendente(1L, 99L);
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));
        when(notificacaoClient.enviarNotificacao(anyString(), anyString(), anyString()))
                .thenReturn(new NotificacaoClient.NotificacaoResultado("ENVIADA", 4L));

        assertDoesNotThrow(() -> service.concluirManutencao(1L, new BigDecimal("300.00")));

        verify(notificacaoClient).enviarNotificacao(eq("MANUTENCAO_CONCLUIDA"), anyString(), contains("N/A"));
        verify(veiculoRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // cancelarManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("cancelarManutencao: sucesso - status CANCELADA")
    void cancelarManutencao_sucesso_statusCancelada() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        veiculo.setStatus("ATIVO");
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));

        service.cancelarManutencao(1L);

        ArgumentCaptor<Manutencao> captor = ArgumentCaptor.forClass(Manutencao.class);
        verify(manutencaoRepository).save(captor.capture());
        assertEquals("CANCELADA", captor.getValue().getStatus());
    }

    @Test
    @DisplayName("cancelarManutencao: veiculo em MANUTENCAO - reativa para ATIVO")
    void cancelarManutencao_veiculoEmManutencao_reativaParaAtivo() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        veiculo.setStatus("MANUTENCAO");
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));

        service.cancelarManutencao(1L);

        ArgumentCaptor<Veiculo> veiculoCaptor = ArgumentCaptor.forClass(Veiculo.class);
        verify(veiculoRepository).save(veiculoCaptor.capture());
        assertEquals("ATIVO", veiculoCaptor.getValue().getStatus());
    }

    @Test
    @DisplayName("cancelarManutencao: veiculo com status diferente de MANUTENCAO - nao salva veiculo")
    void cancelarManutencao_veiculoNaoEmManutencao_naoSalvaVeiculo() {
        Manutencao manutencao = manutencaoPendente(1L, 1L);
        veiculo.setStatus("ATIVO");
        when(manutencaoRepository.findById(1L)).thenReturn(Optional.of(manutencao));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(manutencaoRepository.save(any(Manutencao.class))).thenAnswer(inv -> inv.getArgument(0));

        service.cancelarManutencao(1L);

        verify(veiculoRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // buscarPorId
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("buscarPorId: nao encontrado - lanca RuntimeException")
    void buscarPorId_naoEncontrado_lancaRuntimeException() {
        when(manutencaoRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.buscarPorId(999L));

        assertTrue(ex.getMessage().contains("999"));
    }

    // -------------------------------------------------------------------------
    // obterUltimaManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("obterUltimaManutencao: nenhuma manutencao encontrada - lanca RuntimeException")
    void obterUltimaManutencao_semManutencao_lancaRuntimeException() {
        when(manutencaoRepository.findUltimaManutencao(1L)).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.obterUltimaManutencao(1L));

        assertTrue(ex.getMessage().contains("1"));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Manutencao manutencaoPendente(Long id, Long veiculoId) {
        Manutencao m = new Manutencao();
        m.setId(id);
        m.setVeiculoId(veiculoId);
        m.setTipoManutencao("PREVENTIVA");
        m.setStatus("PENDENTE");
        return m;
    }
}
