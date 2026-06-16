package com.rotalog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rotalog.domain.Manutencao;
import com.rotalog.service.ManutencaoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ManutencaoController.class)
@DisplayName("ManutencaoController - Testes de Integracao Web")
class ManutencaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ManutencaoService manutencaoService;

    // -------------------------------------------------------------------------
    // GET /manutencoes
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listarTodas: retorna 200 com lista de manutencoes")
    void listarTodas_retorna200ComLista() throws Exception {
        Manutencao m1 = manutencaoComId(1L, "PREVENTIVA", "PENDENTE");
        Manutencao m2 = manutencaoComId(2L, "CORRETIVA", "CONCLUIDA");
        when(manutencaoService.listarTodas()).thenReturn(Arrays.asList(m1, m2));

        mockMvc.perform(get("/manutencoes"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("listarTodas: lista vazia - retorna 200 com array vazio")
    void listarTodas_listaVazia_retorna200ArrayVazio() throws Exception {
        when(manutencaoService.listarTodas()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/manutencoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // -------------------------------------------------------------------------
    // GET /manutencoes/{id}
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("buscarPorId: encontrado - retorna 200 com manutencao")
    void buscarPorId_encontrado_retorna200() throws Exception {
        Manutencao m = manutencaoComId(1L, "REVISAO", "EM_ANDAMENTO");
        when(manutencaoService.buscarPorId(1L)).thenReturn(m);

        mockMvc.perform(get("/manutencoes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("buscarPorId: nao encontrado - RuntimeException -> 404 com campo erro")
    void buscarPorId_naoEncontrado_retorna404ComErro() throws Exception {
        when(manutencaoService.buscarPorId(99L))
                .thenThrow(new RuntimeException("Manutencao nao encontrada: 99"));

        mockMvc.perform(get("/manutencoes/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // GET /manutencoes/veiculo/{veiculoId}
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listarPorVeiculo: retorna 200 com lista do veiculo")
    void listarPorVeiculo_retorna200ComLista() throws Exception {
        Manutencao m = manutencaoComId(1L, "PREVENTIVA", "CONCLUIDA");
        when(manutencaoService.listarPorVeiculo(5L)).thenReturn(Collections.singletonList(m));

        mockMvc.perform(get("/manutencoes/veiculo/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // -------------------------------------------------------------------------
    // GET /manutencoes/pendentes
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("listarPendentes: retorna 200 com manutencoes pendentes")
    void listarPendentes_retorna200ComPendentes() throws Exception {
        Manutencao m = manutencaoComId(2L, "CORRETIVA", "PENDENTE");
        when(manutencaoService.listarPendentes()).thenReturn(Collections.singletonList(m));

        mockMvc.perform(get("/manutencoes/pendentes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // -------------------------------------------------------------------------
    // GET /manutencoes/veiculo/{veiculoId}/ultima
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("obterUltimaManutencao: encontrada - retorna 200")
    void obterUltimaManutencao_encontrada_retorna200() throws Exception {
        Manutencao m = manutencaoComId(3L, "REVISAO", "CONCLUIDA");
        when(manutencaoService.obterUltimaManutencao(5L)).thenReturn(m);

        mockMvc.perform(get("/manutencoes/veiculo/5/ultima"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3));
    }

    @Test
    @DisplayName("obterUltimaManutencao: nao encontrada - RuntimeException -> 404 com campo erro")
    void obterUltimaManutencao_naoEncontrada_retorna404ComErro() throws Exception {
        when(manutencaoService.obterUltimaManutencao(99L))
                .thenThrow(new RuntimeException("Nenhuma manutencao encontrada para veiculo: 99"));

        mockMvc.perform(get("/manutencoes/veiculo/99/ultima"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // POST /manutencoes
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("agendarManutencao: sucesso - retorna 201 com manutencao criada")
    void agendarManutencao_sucesso_retorna201() throws Exception {
        Manutencao criada = manutencaoComId(10L, "PREVENTIVA", "PENDENTE");
        when(manutencaoService.agendarManutencao(eq(1L), eq("PREVENTIVA"), anyString(), any()))
                .thenReturn(criada);

        Map<String, Object> body = new HashMap<>();
        body.put("veiculoId", 1);
        body.put("tipoManutencao", "PREVENTIVA");
        body.put("descricao", "Revisao dos 50 mil km");
        body.put("custoEstimado", 1200.00);

        mockMvc.perform(post("/manutencoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @DisplayName("agendarManutencao: servico lanca RuntimeException -> 400 com campo erro")
    void agendarManutencao_excecao_retorna400ComErro() throws Exception {
        when(manutencaoService.agendarManutencao(any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Veiculo nao encontrado: 99"));

        Map<String, Object> body = new HashMap<>();
        body.put("veiculoId", 99);
        body.put("tipoManutencao", "PREVENTIVA");

        mockMvc.perform(post("/manutencoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // PATCH /{id}/iniciar
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("iniciarManutencao: sucesso - retorna 200")
    void iniciarManutencao_sucesso_retorna200() throws Exception {
        Manutencao m = manutencaoComId(1L, "PREVENTIVA", "EM_ANDAMENTO");
        when(manutencaoService.iniciarManutencao(1L)).thenReturn(m);

        mockMvc.perform(patch("/manutencoes/1/iniciar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EM_ANDAMENTO"));
    }

    @Test
    @DisplayName("iniciarManutencao: excecao - retorna 400 com campo erro")
    void iniciarManutencao_excecao_retorna400ComErro() throws Exception {
        when(manutencaoService.iniciarManutencao(99L))
                .thenThrow(new RuntimeException("Manutencao nao encontrada: 99"));

        mockMvc.perform(patch("/manutencoes/99/iniciar"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // PATCH /{id}/concluir
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("concluirManutencao: com custoFinal - retorna 200")
    void concluirManutencao_comCustoFinal_retorna200() throws Exception {
        Manutencao m = manutencaoComId(1L, "PREVENTIVA", "CONCLUIDA");
        m.setCusto(new BigDecimal("1500.00"));
        when(manutencaoService.concluirManutencao(eq(1L), any(BigDecimal.class))).thenReturn(m);

        Map<String, Object> body = new HashMap<>();
        body.put("custoFinal", 1500.00);

        mockMvc.perform(patch("/manutencoes/1/concluir")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"));
    }

    @Test
    @DisplayName("concluirManutencao: sem custoFinal no body - passa null para o servico")
    void concluirManutencao_semCustoFinal_passaNullParaServico() throws Exception {
        Manutencao m = manutencaoComId(1L, "PREVENTIVA", "CONCLUIDA");
        when(manutencaoService.concluirManutencao(eq(1L), isNull())).thenReturn(m);

        mockMvc.perform(patch("/manutencoes/1/concluir")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        verify(manutencaoService).concluirManutencao(eq(1L), isNull());
    }

    @Test
    @DisplayName("concluirManutencao: excecao - retorna 400 com campo erro")
    void concluirManutencao_excecao_retorna400ComErro() throws Exception {
        when(manutencaoService.concluirManutencao(any(), any()))
                .thenThrow(new RuntimeException("Manutencao nao encontrada: 99"));

        mockMvc.perform(patch("/manutencoes/99/concluir")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // PATCH /{id}/cancelar
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("cancelarManutencao: sucesso - retorna 200")
    void cancelarManutencao_sucesso_retorna200() throws Exception {
        Manutencao m = manutencaoComId(1L, "PREVENTIVA", "CANCELADA");
        when(manutencaoService.cancelarManutencao(1L)).thenReturn(m);

        mockMvc.perform(patch("/manutencoes/1/cancelar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADA"));
    }

    @Test
    @DisplayName("cancelarManutencao: excecao - retorna 400 com campo erro")
    void cancelarManutencao_excecao_retorna400ComErro() throws Exception {
        when(manutencaoService.cancelarManutencao(99L))
                .thenThrow(new RuntimeException("Manutencao nao encontrada: 99"));

        mockMvc.perform(patch("/manutencoes/99/cancelar"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").exists());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Manutencao manutencaoComId(Long id, String tipo, String status) {
        Manutencao m = new Manutencao();
        m.setId(id);
        m.setVeiculoId(1L);
        m.setTipoManutencao(tipo);
        m.setStatus(status);
        return m;
    }
}
