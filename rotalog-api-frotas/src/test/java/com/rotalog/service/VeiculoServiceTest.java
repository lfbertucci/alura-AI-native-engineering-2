package com.rotalog.service;

import com.rotalog.domain.Veiculo;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.rotalog.domain.AlertaManutencao;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VeiculoService - Testes Unitários do Coordenador de CRUD")
class VeiculoServiceTest {

    @Mock
    private VeiculoRepository veiculoRepository;

    @Mock
    private VeiculoValidator validator;

    @Mock
    private VeiculoNotificacaoService notificacaoService;

    @Mock
    private ManutencaoPreventivaService manutencaoPreventivaService;

    @InjectMocks
    private VeiculoService veiculoService;

    private Veiculo veiculoExemplo;

    @BeforeEach
    void setUp() {
        veiculoExemplo = new Veiculo();
        veiculoExemplo.setId(1L);
        veiculoExemplo.setPlaca("ABC1234");
        veiculoExemplo.setModelo("Caminhão Volvo");
        veiculoExemplo.setAnoFabricacao(2020);
        veiculoExemplo.setStatus("ATIVO");
        veiculoExemplo.setQuilometragem(10000L);
    }

    // ==================== listarTodos ====================

    @Test
    @DisplayName("listarTodos: retorna lista do repositório")
    void listarTodos_deveRetornarListaDoRepositorio() {
        List<Veiculo> lista = Arrays.asList(veiculoExemplo, new Veiculo());
        when(veiculoRepository.findAll()).thenReturn(lista);

        List<Veiculo> resultado = veiculoService.listarTodos();

        assertNotNull(resultado);
        assertEquals(2, resultado.size());
        verify(veiculoRepository).findAll();
    }

    // ==================== buscarPorId ====================

    @Test
    @DisplayName("buscarPorId: encontrado - retorna veículo")
    void buscarPorId_quandoEncontrado_retornaVeiculo() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));

        Veiculo resultado = veiculoService.buscarPorId(1L);

        assertNotNull(resultado);
        assertEquals(1L, resultado.getId());
        verify(veiculoRepository).findById(1L);
    }

    @Test
    @DisplayName("buscarPorId: não encontrado - lança RuntimeException")
    void buscarPorId_quandoNaoEncontrado_lancaRuntimeException() {
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.buscarPorId(99L));

        assertTrue(ex.getMessage().contains("99"));
        verify(veiculoRepository).findById(99L);
    }

    // ==================== buscarPorPlaca ====================

    @Test
    @DisplayName("buscarPorPlaca: encontrado - retorna veículo")
    void buscarPorPlaca_quandoEncontrado_retornaVeiculo() {
        when(veiculoRepository.findByPlaca("ABC1234")).thenReturn(Optional.of(veiculoExemplo));

        Veiculo resultado = veiculoService.buscarPorPlaca("ABC1234");

        assertNotNull(resultado);
        assertEquals("ABC1234", resultado.getPlaca());
    }

    @Test
    @DisplayName("buscarPorPlaca: não encontrado - lança RuntimeException")
    void buscarPorPlaca_quandoNaoEncontrado_lancaRuntimeException() {
        when(veiculoRepository.findByPlaca("ZZZ9999")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.buscarPorPlaca("ZZZ9999"));

        assertTrue(ex.getMessage().contains("ZZZ9999"));
    }

    // ==================== registrarVeiculo ====================

    @Test
    @DisplayName("registrarVeiculo: placa inválida - delega ao validator e propaga exceção")
    void registrarVeiculo_comPlacaInvalida_propagaExcecaoDoValidator() {
        doThrow(new RuntimeException("Placa é obrigatória"))
                .when(validator).validarPlaca(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.registrarVeiculo(null, "Modelo", 2020));

        assertTrue(ex.getMessage().contains("Placa"));
        verify(validator).validarPlaca(null);
    }

    @Test
    @DisplayName("registrarVeiculo: placa duplicada - lança exceção antes de validar modelo/ano")
    void registrarVeiculo_comPlacaDuplicada_lancaExcecao() {
        when(veiculoRepository.findByPlaca("ABC1234")).thenReturn(Optional.of(veiculoExemplo));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.registrarVeiculo("ABC1234", "Modelo", 2020));

        assertTrue(ex.getMessage().contains("ABC1234"));
        verify(validator).validarPlaca("ABC1234");
        verify(validator, never()).validarModelo(any());
    }

    @Test
    @DisplayName("registrarVeiculo: modelo inválido - delega ao validator e propaga exceção")
    void registrarVeiculo_comModeloInvalido_propagaExcecaoDoValidator() {
        when(veiculoRepository.findByPlaca("XYZ9876")).thenReturn(Optional.empty());
        doThrow(new RuntimeException("Modelo é obrigatório"))
                .when(validator).validarModelo(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.registrarVeiculo("XYZ9876", null, 2020));

        assertTrue(ex.getMessage().contains("Modelo"));
    }

    @Test
    @DisplayName("registrarVeiculo: ano inválido - delega ao validator e propaga exceção")
    void registrarVeiculo_comAnoInvalido_propagaExcecaoDoValidator() {
        when(veiculoRepository.findByPlaca("XYZ9876")).thenReturn(Optional.empty());
        doThrow(new RuntimeException("Ano de fabricação inválido"))
                .when(validator).validarAnoFabricacao(1800);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.registrarVeiculo("XYZ9876", "Modelo", 1800));

        assertTrue(ex.getMessage().contains("Ano") || ex.getMessage().contains("nválido"));
    }

    @Test
    @DisplayName("registrarVeiculo: caminho feliz - placa em maiúsculo, status ATIVO, km 0, notificação enviada")
    void registrarVeiculo_caminhoFeliz_salvaNormalmente() {
        when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());
        when(veiculoRepository.save(any(Veiculo.class))).thenAnswer(invocation -> {
            Veiculo v = invocation.getArgument(0);
            v.setId(10L);
            return v;
        });

        Veiculo resultado = veiculoService.registrarVeiculo("abc1234", "Caminhão Volvo", 2020);

        assertNotNull(resultado);
        assertEquals("ABC1234", resultado.getPlaca());
        assertEquals("ATIVO", resultado.getStatus());
        assertEquals(0L, resultado.getQuilometragem());
        verify(notificacaoService).notificarNovoVeiculo(any(Veiculo.class));
    }

    // ==================== atualizarVeiculo ====================

    @Test
    @DisplayName("atualizarVeiculo: atualiza modelo, ano e quilometragem")
    void atualizarVeiculo_atualizaCamposInformados() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        veiculoService.atualizarVeiculo(1L, "Novo Modelo", 2022, 20000L);

        assertEquals("Novo Modelo", veiculoExemplo.getModelo());
        assertEquals(2022, veiculoExemplo.getAnoFabricacao());
        assertEquals(20000L, veiculoExemplo.getQuilometragem());
        verify(veiculoRepository).save(veiculoExemplo);
    }

    @Test
    @DisplayName("atualizarVeiculo: campos null são ignorados")
    void atualizarVeiculo_camposNullSaoIgnorados() {
        String modeloOriginal = veiculoExemplo.getModelo();
        Integer anoOriginal = veiculoExemplo.getAnoFabricacao();
        Long kmOriginal = veiculoExemplo.getQuilometragem();

        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        veiculoService.atualizarVeiculo(1L, null, null, null);

        assertEquals(modeloOriginal, veiculoExemplo.getModelo());
        assertEquals(anoOriginal, veiculoExemplo.getAnoFabricacao());
        assertEquals(kmOriginal, veiculoExemplo.getQuilometragem());
    }

    @Test
    @DisplayName("atualizarVeiculo: modelo vazio é ignorado")
    void atualizarVeiculo_modeloVazioEhIgnorado() {
        String modeloOriginal = veiculoExemplo.getModelo();

        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        veiculoService.atualizarVeiculo(1L, "", null, null);

        assertEquals(modeloOriginal, veiculoExemplo.getModelo());
    }

    @Test
    @DisplayName("atualizarVeiculo: quilometragem menor que atual emite log warn e salva")
    void atualizarVeiculo_quilometragemMenorQueAtual_emiteWarnESalva() {
        veiculoExemplo.setQuilometragem(30000L);
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        assertDoesNotThrow(() -> veiculoService.atualizarVeiculo(1L, null, null, 5000L));
        assertEquals(5000L, veiculoExemplo.getQuilometragem());
    }

    @Test
    @DisplayName("atualizarVeiculo: não encontrado - lança RuntimeException")
    void atualizarVeiculo_naoEncontrado_lancaExcecao() {
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> veiculoService.atualizarVeiculo(99L, "Modelo", 2020, 1000L));
    }

    // ==================== atualizarQuilometragem ====================

    @Test
    @DisplayName("atualizarQuilometragem: quilometragem negativa - validator propaga exceção")
    void atualizarQuilometragem_negativa_validatorPropagaExcecao() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        doThrow(new RuntimeException("Quilometragem não pode ser negativa"))
                .when(validator).validarQuilometragem(-1L);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.atualizarQuilometragem(1L, -1L));

        assertTrue(ex.getMessage().contains("negativa") || ex.getMessage().contains("Quilometragem"));
    }

    @Test
    @DisplayName("atualizarQuilometragem: menor que atual - loga aviso e salva")
    void atualizarQuilometragem_menorQueAtual_logaAvisoESalva() {
        veiculoExemplo.setQuilometragem(20000L);
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);
        when(manutencaoPreventivaService.verificarEAlertar(any(Veiculo.class))).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> veiculoService.atualizarQuilometragem(1L, 5000L));
        verify(veiculoRepository).save(veiculoExemplo);
    }

    @Test
    @DisplayName("atualizarQuilometragem: verificarEAlertar dispara - grava alerta de manutencao")
    void atualizarQuilometragem_verificarEAlertarDispara_gravaAlerta() {
        veiculoExemplo.setQuilometragem(49000L);
        AlertaManutencao alerta = new AlertaManutencao();
        alerta.setId(1L);
        alerta.setStatusNotificacao("ENVIADA");
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);
        when(manutencaoPreventivaService.verificarEAlertar(any(Veiculo.class))).thenReturn(Optional.of(alerta));

        Veiculo resultado = veiculoService.atualizarQuilometragem(1L, 60000L);

        assertNotNull(resultado);
        verify(manutencaoPreventivaService).verificarEAlertar(any(Veiculo.class));
    }

    @Test
    @DisplayName("atualizarQuilometragem: verificarEAlertar nao dispara - nenhum alerta gerado")
    void atualizarQuilometragem_verificarEAlertarNaoDispara_nenhumAlerta() {
        veiculoExemplo.setQuilometragem(10000L);
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);
        when(manutencaoPreventivaService.verificarEAlertar(any(Veiculo.class))).thenReturn(Optional.empty());

        Veiculo resultado = veiculoService.atualizarQuilometragem(1L, 15000L);

        assertNotNull(resultado);
        verify(manutencaoPreventivaService).verificarEAlertar(any(Veiculo.class));
    }

    // ==================== obterVeiculosPorStatus ====================

    @Test
    @DisplayName("obterVeiculosPorStatus: status ATIVO válido - retorna lista")
    void obterVeiculosPorStatus_statusValido_retornaLista() {
        when(veiculoRepository.findByStatus("ATIVO")).thenReturn(Arrays.asList(veiculoExemplo));

        List<Veiculo> resultado = veiculoService.obterVeiculosPorStatus("ATIVO");

        assertEquals(1, resultado.size());
        verify(veiculoRepository).findByStatus("ATIVO");
    }

    @Test
    @DisplayName("obterVeiculosPorStatus: status INATIVO válido - retorna lista")
    void obterVeiculosPorStatus_statusInativo_retornaLista() {
        when(veiculoRepository.findByStatus("INATIVO")).thenReturn(Collections.emptyList());

        List<Veiculo> resultado = veiculoService.obterVeiculosPorStatus("INATIVO");

        assertNotNull(resultado);
        verify(veiculoRepository).findByStatus("INATIVO");
    }

    @Test
    @DisplayName("obterVeiculosPorStatus: status MANUTENCAO válido - retorna lista")
    void obterVeiculosPorStatus_statusManutencao_retornaLista() {
        when(veiculoRepository.findByStatus("MANUTENCAO")).thenReturn(Collections.emptyList());

        List<Veiculo> resultado = veiculoService.obterVeiculosPorStatus("MANUTENCAO");

        assertNotNull(resultado);
    }

    @Test
    @DisplayName("obterVeiculosPorStatus: status inválido - lança exceção")
    void obterVeiculosPorStatus_statusInvalido_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> veiculoService.obterVeiculosPorStatus("INVALIDO"));
        assertTrue(ex.getMessage().contains("INVALIDO"));
    }

    // ==================== desativarVeiculo ====================

    @Test
    @DisplayName("desativarVeiculo: sucesso - status INATIVO e notificação enviada")
    void desativarVeiculo_sucesso_statusInativoENotificacaoEnviada() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        veiculoService.desativarVeiculo(1L);

        assertEquals("INATIVO", veiculoExemplo.getStatus());
        verify(notificacaoService).notificarDesativacao(any(Veiculo.class));
    }

    @Test
    @DisplayName("desativarVeiculo: não encontrado - lança RuntimeException")
    void desativarVeiculo_naoEncontrado_lancaExcecao() {
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> veiculoService.desativarVeiculo(99L));
    }

    // ==================== reativarVeiculo ====================

    @Test
    @DisplayName("reativarVeiculo: status volta a ATIVO")
    void reativarVeiculo_statusVoltaAAtivo() {
        veiculoExemplo.setStatus("INATIVO");
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculoExemplo));
        when(veiculoRepository.save(any(Veiculo.class))).thenReturn(veiculoExemplo);

        veiculoService.reativarVeiculo(1L);

        assertEquals("ATIVO", veiculoExemplo.getStatus());
        verify(veiculoRepository).save(veiculoExemplo);
    }

    @Test
    @DisplayName("reativarVeiculo: não encontrado - lança RuntimeException")
    void reativarVeiculo_naoEncontrado_lancaExcecao() {
        when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> veiculoService.reativarVeiculo(99L));
    }

    // ==================== sincronizarComSistemaExterno ====================

    @Test
    @DisplayName("sincronizarComSistemaExterno: executa sem erro")
    void sincronizarComSistemaExterno_executaSemErro() {
        assertDoesNotThrow(() -> veiculoService.sincronizarComSistemaExterno());
    }
}
