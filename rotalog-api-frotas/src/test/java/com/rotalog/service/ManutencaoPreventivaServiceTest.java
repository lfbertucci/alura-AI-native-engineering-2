package com.rotalog.service;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Manutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.ManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.NotificacaoClient.NotificacaoResultado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManutencaoPreventivaService - Testes Unitarios")
class ManutencaoPreventivaServiceTest {

    @Mock
    private ManutencaoRepository manutencaoRepository;

    @Mock
    private AlertaManutencaoRepository alertaManutencaoRepository;

    @Mock
    private VeiculoRepository veiculoRepository;

    @Mock
    private VeiculoNotificacaoService notificacaoService;

    @InjectMocks
    private ManutencaoPreventivaService service;

    private Veiculo veiculo;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "intervaloKm", 10000L);
        ReflectionTestUtils.setField(service, "intervaloMeses", 6L);

        veiculo = new Veiculo();
        veiculo.setId(1L);
        veiculo.setPlaca("ABC1234");
        veiculo.setModelo("Caminhao Volvo");
        veiculo.setQuilometragem(15000L);
        veiculo.setDataCadastro(LocalDateTime.now().minusYears(2));
    }

    // -------------------------------------------------------------------------
    // calcularCustoManutencao
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("calcularCustoManutencao: valida formula 500 + km * 0.05")
    void calcularCustoManutencao_validaFormula() {
        Double resultado = service.calcularCustoManutencao("Modelo X", 10000L);
        assertEquals(500.0 + 10000L * 0.05, resultado, 0.001);
    }

    // -------------------------------------------------------------------------
    // verificarEAlertar — disparo por KM
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("dispara por KM: km percorrido desde baseline >= intervalo -> grava alerta e notifica")
    void verificarEAlertar_disparaPorKm_gravaAlertaENotifica() {
        // baseline: manutenção CONCLUIDA com km=4000, sem alerta anterior
        Manutencao ultimaManutencao = manutencaoComKmEData(4000L, LocalDateTime.now().minusMonths(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        // veiculo.quilometragem=15000, baseline_km=4000 → diferenca=11000 >= 10000 → dispara por KM
        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(10L);
        alertaSalvo.setStatusNotificacao("PENDENTE");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 99L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(alertaManutencaoRepository, times(2)).save(any(AlertaManutencao.class));
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM"));
    }

    // -------------------------------------------------------------------------
    // verificarEAlertar — disparo por TEMPO
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("dispara por TEMPO: meses desde baseline >= intervalo, km abaixo -> grava alerta e notifica")
    void verificarEAlertar_disparaPorTempo_gravaAlertaENotifica() {
        // baseline: manutenção CONCLUIDA com km=14500 (delta < 10000), data há 7 meses
        Manutencao ultimaManutencao = manutencaoComKmEData(14500L, LocalDateTime.now().minusMonths(7));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        // km delta = 15000-14500 = 500 < 10000; meses = 7 >= 6 → dispara por TEMPO
        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(11L);
        alertaSalvo.setStatusNotificacao("PENDENTE");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("TEMPO")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 100L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("TEMPO"));
    }

    // -------------------------------------------------------------------------
    // verificarEAlertar — nao dispara
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("nao dispara: km e tempo dentro dos intervalos -> retorna Optional.empty()")
    void verificarEAlertar_dentroDoIntervalo_naoDispara() {
        // baseline: alerta recente com km=14000, data há 1 mês
        AlertaManutencao alertaRecente = alertaComKmEData(14000L, LocalDateTime.now().minusMonths(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(null);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.of(alertaRecente));

        // km delta = 15000-14000 = 1000 < 10000; meses = 1 < 6 → nao dispara
        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertFalse(resultado.isPresent());
        verifyNoInteractions(notificacaoService);
        verify(alertaManutencaoRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // verificarEAlertar — api-notificacoes fora -> PENDENTE (sem excecao)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("notificacoes fora: client retorna PENDENTE -> alerta salvo com PENDENTE, sem excecao")
    void verificarEAlertar_notificacoesFora_alertaSalvoComPendente() {
        Manutencao ultimaManutencao = manutencaoComKmEData(0L, LocalDateTime.now().minusYears(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(12L);
        alertaSalvo.setStatusNotificacao("PENDENTE");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        // Client absorve falha e retorna PENDENTE
        when(notificacaoService.notificarAlertaManutencao(any(), any(), any()))
                .thenReturn(new NotificacaoResultado("PENDENTE", null));

        // Nao deve lancar excecao
        assertDoesNotThrow(() -> {
            Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);
            assertTrue(resultado.isPresent());
        });

        // Verifica que o alerta foi atualizado com PENDENTE
        ArgumentCaptor<AlertaManutencao> captor = ArgumentCaptor.forClass(AlertaManutencao.class);
        verify(alertaManutencaoRepository, times(2)).save(captor.capture());
        AlertaManutencao alertaFinal = captor.getAllValues().get(1);
        assertEquals("PENDENTE", alertaFinal.getStatusNotificacao());
        assertNull(alertaFinal.getNotificacaoId());
    }

    // -------------------------------------------------------------------------
    // verificarEAlertar — status ENVIADA -> alerta atualizado com notificacaoId
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("status ENVIADA: client retorna ENVIADA e id -> alerta atualizado com notificacaoId")
    void verificarEAlertar_statusEnviada_alertaAtualizadoComId() {
        Manutencao ultimaManutencao = manutencaoComKmEData(0L, LocalDateTime.now().minusYears(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(13L);
        alertaSalvo.setStatusNotificacao("PENDENTE");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(any(), any(), any()))
                .thenReturn(new NotificacaoResultado("ENVIADA", 42L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());

        ArgumentCaptor<AlertaManutencao> captor = ArgumentCaptor.forClass(AlertaManutencao.class);
        verify(alertaManutencaoRepository, times(2)).save(captor.capture());
        AlertaManutencao alertaFinal = captor.getAllValues().get(1);
        assertEquals("ENVIADA", alertaFinal.getStatusNotificacao());
        assertEquals(42L, alertaFinal.getNotificacaoId());
    }

    // -------------------------------------------------------------------------
    // reprocessarPendentes
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("reprocessarPendentes: alerta PENDENTE/FALHA e reenviado e atualizado")
    void reprocessarPendentes_alertasPendentes_reenviadosEAtualizados() {
        AlertaManutencao alertaPendente = new AlertaManutencao();
        alertaPendente.setId(20L);
        alertaPendente.setVeiculoId(1L);
        alertaPendente.setQuilometragemAlerta(15000L);
        alertaPendente.setMotivo("KM");
        alertaPendente.setStatusNotificacao("PENDENTE");

        AlertaManutencao alertaFalha = new AlertaManutencao();
        alertaFalha.setId(21L);
        alertaFalha.setVeiculoId(1L);
        alertaFalha.setQuilometragemAlerta(12000L);
        alertaFalha.setMotivo("TEMPO");
        alertaFalha.setStatusNotificacao("FALHA");

        when(alertaManutencaoRepository.findByStatusNotificacaoIn(Arrays.asList("PENDENTE", "FALHA")))
                .thenReturn(Arrays.asList(alertaPendente, alertaFalha));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(notificacaoService.notificarAlertaManutencao(any(), any(), any()))
                .thenReturn(new NotificacaoResultado("ENVIADA", 55L));

        service.reprocessarPendentes();

        verify(notificacaoService, times(2)).notificarAlertaManutencao(any(), any(), any());
        verify(alertaManutencaoRepository, times(2)).save(any(AlertaManutencao.class));

        assertEquals("ENVIADA", alertaPendente.getStatusNotificacao());
        assertEquals(55L, alertaPendente.getNotificacaoId());
        assertEquals("ENVIADA", alertaFalha.getStatusNotificacao());
    }

    @Test
    @DisplayName("reprocessarPendentes: nenhum pendente -> nao chama notificacao")
    void reprocessarPendentes_semPendentes_naoNotifica() {
        when(alertaManutencaoRepository.findByStatusNotificacaoIn(any()))
                .thenReturn(Collections.emptyList());

        service.reprocessarPendentes();

        verifyNoInteractions(notificacaoService);
        verify(alertaManutencaoRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // baseline — mais recente entre manutencao e alerta
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("baseline usa o mais recente entre ultima manutencao CONCLUIDA e ultimo alerta")
    void verificarEAlertar_baselineUsaMaisRecente_alerta() {
        // Manutenção: km=5000, há 8 meses
        Manutencao manutencao = manutencaoComKmEData(5000L, LocalDateTime.now().minusMonths(8));
        // Alerta: km=13000, há 2 meses (mais recente)
        AlertaManutencao alertaRecente = alertaComKmEData(13000L, LocalDateTime.now().minusMonths(2));

        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(manutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.of(alertaRecente));

        // Com baseline no alerta: km delta = 15000-13000=2000 < 10000; meses=2 < 6 → nao dispara
        // (se baseline fosse a manutencao: km delta = 15000-5000=10000 >= 10000 → dispararia)
        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertFalse(resultado.isPresent(), "Deve usar o alerta mais recente como baseline e nao disparar");
        verifyNoInteractions(notificacaoService);
    }

    @Test
    @DisplayName("baseline usa o mais recente entre ultima manutencao CONCLUIDA e ultimo alerta — manutencao mais recente")
    void verificarEAlertar_baselineUsaMaisRecente_manutencao() {
        // Alerta: km=0, há 10 meses (mais antigo)
        AlertaManutencao alertaAntigo = alertaComKmEData(0L, LocalDateTime.now().minusMonths(10));
        // Manutenção: km=14500, há 1 mês (mais recente)
        Manutencao manutencaoRecente = manutencaoComKmEData(14500L, LocalDateTime.now().minusMonths(1));

        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(manutencaoRecente);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.of(alertaAntigo));

        // Com baseline na manutencao: km delta = 15000-14500=500 < 10000; meses=1 < 6 → nao dispara
        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertFalse(resultado.isPresent(), "Deve usar a manutencao mais recente como baseline e nao disparar");
        verifyNoInteractions(notificacaoService);
    }

    // -------------------------------------------------------------------------
    // Casos de borda — limites exatos de intervalo
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("verificarEAlertar: kmPercorrido == intervaloKm (10000) - dispara por KM")
    void verificarEAlertar_kmPercorridoIgualIntervalo_disparaPorKm() {
        // veiculo.quilometragem = 15000; baseline km = 5000 → delta = 10000 == intervaloKm
        Manutencao ultimaManutencao = manutencaoComKmEData(5000L, LocalDateTime.now().minusMonths(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(30L);
        alertaSalvo.setStatusNotificacao("ENVIADA");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 30L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM"));
    }

    @Test
    @DisplayName("verificarEAlertar: mesesDecorridos == intervaloMeses (6) e km abaixo - dispara por TEMPO")
    void verificarEAlertar_mesesIgualIntervaloComKmAbaixo_disparaPorTempo() {
        // veiculo.quilometragem = 15000; baseline km = 14600 (delta = 400 < 10000); baseline data = exatamente 6 meses atrás
        Manutencao ultimaManutencao = manutencaoComKmEData(14600L, LocalDateTime.now().minusMonths(6));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(31L);
        alertaSalvo.setStatusNotificacao("ENVIADA");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("TEMPO")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 31L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("TEMPO"));
    }

    @Test
    @DisplayName("verificarEAlertar: ambas as condicoes satisfeitas - motivo e KM (avaliado primeiro)")
    void verificarEAlertar_ambasCondicoesSatisfeitas_motivoEhKm() {
        // km delta >= 10000 E meses >= 6 → KM deve ser o motivo (if avaliado primeiro)
        Manutencao ultimaManutencao = manutencaoComKmEData(4000L, LocalDateTime.now().minusMonths(7));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(32L);
        alertaSalvo.setStatusNotificacao("ENVIADA");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 32L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(15000L), eq("KM"));
        verify(notificacaoService, never()).notificarAlertaManutencao(eq(veiculo), any(), eq("TEMPO"));
    }

    @Test
    @DisplayName("verificarEAlertar: quilometragem nula no veiculo - tratada como 0 sem NullPointerException")
    void verificarEAlertar_quilometragemNulaNoVeiculo_tratadaComo0SemNpe() {
        veiculo.setQuilometragem(null);

        // baseline km = 0, data ha 1 mes → delta = 0 < 10000; meses = 1 < 6 → nao dispara
        Manutencao ultimaManutencao = manutencaoComKmEData(0L, LocalDateTime.now().minusMonths(1));
        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(ultimaManutencao);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        assertDoesNotThrow(() -> {
            Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);
            assertFalse(resultado.isPresent());
        });

        verifyNoInteractions(notificacaoService);
    }

    @Test
    @DisplayName("verificarEAlertar: sem manutencao nem alerta (ambas nulas) - usa dataCadastro como baseline e dispara TEMPO")
    void verificarEAlertar_semManutencaoNemAlerta_usaDataCadastroEDisparaTempo() {
        // dataCadastro do veiculo = 2 anos atras, sem manutenção nem alerta -> meses >> 6 → TEMPO
        // km abaixo do intervalo para garantir que nao dispara por KM
        veiculo.setDataCadastro(LocalDateTime.now().minusYears(2));
        veiculo.setQuilometragem(5000L);

        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(null);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(33L);
        alertaSalvo.setStatusNotificacao("ENVIADA");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(5000L), eq("TEMPO")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 33L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(5000L), eq("TEMPO"));
    }

    @Test
    @DisplayName("verificarEAlertar: dataCadastro nula e sem baseline - fallback de 10 anos atras dispara TEMPO")
    void verificarEAlertar_dataCadastroNulaSemBaseline_fallback10AnosDisparaTempo() {
        veiculo.setDataCadastro(null);
        veiculo.setQuilometragem(5000L); // abaixo do intervaloKm para nao disparar por KM

        when(manutencaoRepository.findUltimaManutencaoConcluida(1L)).thenReturn(null);
        when(alertaManutencaoRepository.findFirstByVeiculoIdOrderByDataAlertaDesc(1L))
                .thenReturn(Optional.empty());

        AlertaManutencao alertaSalvo = new AlertaManutencao();
        alertaSalvo.setId(34L);
        alertaSalvo.setStatusNotificacao("ENVIADA");
        when(alertaManutencaoRepository.save(any(AlertaManutencao.class))).thenReturn(alertaSalvo);
        when(notificacaoService.notificarAlertaManutencao(eq(veiculo), eq(5000L), eq("TEMPO")))
                .thenReturn(new NotificacaoResultado("ENVIADA", 34L));

        Optional<AlertaManutencao> resultado = service.verificarEAlertar(veiculo);

        assertTrue(resultado.isPresent());
        verify(notificacaoService).notificarAlertaManutencao(eq(veiculo), eq(5000L), eq("TEMPO"));
    }

    // -------------------------------------------------------------------------
    // reprocessarPendentes — caso de borda: veiculoId inexistente
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("reprocessarPendentes: alerta com veiculoId inexistente - continua sem notificar nem salvar aquele alerta")
    void reprocessarPendentes_veiculoIdInexistente_continuaSemNotificarNemSalvar() {
        AlertaManutencao alertaSemVeiculo = new AlertaManutencao();
        alertaSemVeiculo.setId(40L);
        alertaSemVeiculo.setVeiculoId(999L);
        alertaSemVeiculo.setQuilometragemAlerta(5000L);
        alertaSemVeiculo.setMotivo("KM");
        alertaSemVeiculo.setStatusNotificacao("PENDENTE");

        AlertaManutencao alertaValido = new AlertaManutencao();
        alertaValido.setId(41L);
        alertaValido.setVeiculoId(1L);
        alertaValido.setQuilometragemAlerta(15000L);
        alertaValido.setMotivo("TEMPO");
        alertaValido.setStatusNotificacao("FALHA");

        when(alertaManutencaoRepository.findByStatusNotificacaoIn(Arrays.asList("PENDENTE", "FALHA")))
                .thenReturn(Arrays.asList(alertaSemVeiculo, alertaValido));
        when(veiculoRepository.findById(999L)).thenReturn(Optional.empty());
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        when(notificacaoService.notificarAlertaManutencao(any(), any(), any()))
                .thenReturn(new NotificacaoResultado("ENVIADA", 55L));

        service.reprocessarPendentes();

        // Apenas o alerta valido deve ser notificado e salvo
        verify(notificacaoService, times(1)).notificarAlertaManutencao(any(), any(), any());
        verify(alertaManutencaoRepository, times(1)).save(any(AlertaManutencao.class));

        // O alerta com veiculo inexistente nao deve ter sido alterado
        assertEquals("PENDENTE", alertaSemVeiculo.getStatusNotificacao());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Manutencao manutencaoComKmEData(long km, LocalDateTime data) {
        Manutencao m = new Manutencao();
        m.setVeiculoId(veiculo.getId());
        m.setQuilometragemManutencao(km);
        m.setDataManutencao(data);
        m.setStatus("CONCLUIDA");
        return m;
    }

    private AlertaManutencao alertaComKmEData(long km, LocalDateTime data) {
        AlertaManutencao a = new AlertaManutencao();
        a.setVeiculoId(veiculo.getId());
        a.setQuilometragemAlerta(km);
        a.setDataAlerta(data);
        a.setStatusNotificacao("ENVIADA");
        return a;
    }
}
