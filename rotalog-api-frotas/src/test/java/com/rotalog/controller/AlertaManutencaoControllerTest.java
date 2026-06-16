package com.rotalog.controller;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.ManutencaoPreventivaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AlertaManutencaoController.class)
@DisplayName("AlertaManutencaoController - Testes de Integracao Web")
class AlertaManutencaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AlertaManutencaoRepository alertaManutencaoRepository;

    @MockBean
    private VeiculoRepository veiculoRepository;

    @MockBean
    private ManutencaoPreventivaService manutencaoPreventivaService;

    // -------------------------------------------------------------------------
    // GET /alertas-manutencao (sem filtro de status)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listar: sem parametro status - usa findAllByOrderByDataAlertaDesc e retorna 200 com placa e modelo")
    void listar_semStatus_usaFindAllERetorna200ComPlacaEModelo() throws Exception {
        AlertaManutencao alerta = alertaComVeiculo(1L, 10L, "KM");
        Veiculo veiculo = veiculoComId(10L, "ABC1234", "Volvo FH");

        when(alertaManutencaoRepository.findAllByOrderByDataAlertaDesc())
                .thenReturn(Collections.singletonList(alerta));
        when(veiculoRepository.findById(10L)).thenReturn(Optional.of(veiculo));

        mockMvc.perform(get("/alertas-manutencao"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].placa").value("ABC1234"))
                .andExpect(jsonPath("$[0].modelo").value("Volvo FH"));

        verify(alertaManutencaoRepository).findAllByOrderByDataAlertaDesc();
        verify(alertaManutencaoRepository, never()).findByStatusNotificacaoOrderByDataAlertaDesc(any());
    }

    // -------------------------------------------------------------------------
    // GET /alertas-manutencao?status=PENDENTE
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listar: com status=PENDENTE - usa findByStatusNotificacaoOrderByDataAlertaDesc")
    void listar_comStatusPendente_usaFindByStatus() throws Exception {
        AlertaManutencao alerta = alertaComVeiculo(2L, 20L, "TEMPO");
        Veiculo veiculo = veiculoComId(20L, "XYZ9999", "Mercedes Actros");

        when(alertaManutencaoRepository.findByStatusNotificacaoOrderByDataAlertaDesc("PENDENTE"))
                .thenReturn(Collections.singletonList(alerta));
        when(veiculoRepository.findById(20L)).thenReturn(Optional.of(veiculo));

        mockMvc.perform(get("/alertas-manutencao").param("status", "PENDENTE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].placa").value("XYZ9999"));

        verify(alertaManutencaoRepository).findByStatusNotificacaoOrderByDataAlertaDesc("PENDENTE");
        verify(alertaManutencaoRepository, never()).findAllByOrderByDataAlertaDesc();
    }

    // -------------------------------------------------------------------------
    // GET /alertas-manutencao — enriquecimento: veiculo inexistente
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listar: veiculo inexistente - placa e modelo retornam N/A")
    void listar_veiculoInexistente_placaEModeloRetornamNA() throws Exception {
        AlertaManutencao alerta = alertaComVeiculo(3L, 99L, "KM");

        when(alertaManutencaoRepository.findAllByOrderByDataAlertaDesc())
                .thenReturn(Collections.singletonList(alerta));
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/alertas-manutencao"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].placa").value("N/A"))
                .andExpect(jsonPath("$[0].modelo").value("N/A"));
    }

    // -------------------------------------------------------------------------
    // POST /alertas-manutencao/verificar
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("verificar: chama reprocessarPendentes, varre ativos e retorna alertas gerados")
    void verificar_chamaReprocessarEVarreAtivos_retornaAlertasGerados() throws Exception {
        Veiculo veiculo = veiculoComId(1L, "DEF4567", "Scania R");
        AlertaManutencao alertaGerado = alertaComVeiculo(5L, 1L, "KM");

        when(veiculoRepository.findByStatus("ATIVO"))
                .thenReturn(Collections.singletonList(veiculo));
        when(manutencaoPreventivaService.verificarEAlertar(veiculo))
                .thenReturn(Optional.of(alertaGerado));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));

        mockMvc.perform(post("/alertas-manutencao/verificar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].placa").value("DEF4567"))
                .andExpect(jsonPath("$[0].motivo").value("KM"));

        verify(manutencaoPreventivaService).reprocessarPendentes();
        verify(manutencaoPreventivaService).verificarEAlertar(veiculo);
    }

    @Test
    @DisplayName("verificar: nenhum veiculo ativo - retorna lista vazia e nao chama verificarEAlertar")
    void verificar_semVeiculosAtivos_retornaListaVazia() throws Exception {
        when(veiculoRepository.findByStatus("ATIVO")).thenReturn(Collections.emptyList());

        mockMvc.perform(post("/alertas-manutencao/verificar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        verify(manutencaoPreventivaService).reprocessarPendentes();
        verify(manutencaoPreventivaService, never()).verificarEAlertar(any());
    }

    @Test
    @DisplayName("verificar: multiplos veiculos ativos - retorna somente os que geraram alerta")
    void verificar_multiplosVeiculos_retornaSomenteComAlerta() throws Exception {
        Veiculo v1 = veiculoComId(1L, "AAA0001", "Modelo A");
        Veiculo v2 = veiculoComId(2L, "BBB0002", "Modelo B");
        AlertaManutencao alertaGerado = alertaComVeiculo(6L, 1L, "TEMPO");

        when(veiculoRepository.findByStatus("ATIVO")).thenReturn(Arrays.asList(v1, v2));
        when(manutencaoPreventivaService.verificarEAlertar(v1))
                .thenReturn(Optional.of(alertaGerado));
        when(manutencaoPreventivaService.verificarEAlertar(v2))
                .thenReturn(Optional.empty());
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(v1));

        mockMvc.perform(post("/alertas-manutencao/verificar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].placa").value("AAA0001"));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private AlertaManutencao alertaComVeiculo(Long id, Long veiculoId, String motivo) {
        AlertaManutencao a = new AlertaManutencao();
        a.setId(id);
        a.setVeiculoId(veiculoId);
        a.setQuilometragemAlerta(15000L);
        a.setMotivo(motivo);
        a.setDataAlerta(LocalDateTime.now());
        a.setStatusNotificacao("ENVIADA");
        return a;
    }

    private Veiculo veiculoComId(Long id, String placa, String modelo) {
        Veiculo v = new Veiculo();
        v.setId(id);
        v.setPlaca(placa);
        v.setModelo(modelo);
        v.setStatus("ATIVO");
        return v;
    }
}
