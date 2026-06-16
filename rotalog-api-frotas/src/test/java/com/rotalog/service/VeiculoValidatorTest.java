package com.rotalog.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("VeiculoValidator - Testes Unitários")
class VeiculoValidatorTest {

    private final VeiculoValidator validator = new VeiculoValidator();

    // ==================== validarPlaca ====================

    @Test
    @DisplayName("validarPlaca: null - lança exceção com mensagem correta")
    void validarPlaca_null_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarPlaca(null));
        assertEquals("Placa é obrigatória", ex.getMessage());
    }

    @Test
    @DisplayName("validarPlaca: vazia - lança exceção com mensagem correta")
    void validarPlaca_vazia_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarPlaca(""));
        assertEquals("Placa é obrigatória", ex.getMessage());
    }

    @Test
    @DisplayName("validarPlaca: menos de 7 caracteres - lança exceção")
    void validarPlaca_menosDe7Caracteres_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarPlaca("AB123"));
        assertEquals("Placa deve ter 7 caracteres", ex.getMessage());
    }

    @Test
    @DisplayName("validarPlaca: mais de 7 caracteres - lança exceção")
    void validarPlaca_maisDe7Caracteres_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarPlaca("ABC12345"));
        assertEquals("Placa deve ter 7 caracteres", ex.getMessage());
    }

    @Test
    @DisplayName("validarPlaca: 7 caracteres - não lança exceção")
    void validarPlaca_7Caracteres_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarPlaca("ABC1234"));
    }

    // ==================== validarModelo ====================

    @Test
    @DisplayName("validarModelo: null - lança exceção com mensagem correta")
    void validarModelo_null_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarModelo(null));
        assertEquals("Modelo é obrigatório", ex.getMessage());
    }

    @Test
    @DisplayName("validarModelo: vazio - lança exceção com mensagem correta")
    void validarModelo_vazio_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarModelo(""));
        assertEquals("Modelo é obrigatório", ex.getMessage());
    }

    @Test
    @DisplayName("validarModelo: válido - não lança exceção")
    void validarModelo_valido_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarModelo("Caminhão Volvo"));
    }

    // ==================== validarAnoFabricacao ====================

    @Test
    @DisplayName("validarAnoFabricacao: null - lança exceção com mensagem correta")
    void validarAnoFabricacao_null_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarAnoFabricacao(null));
        assertEquals("Ano de fabricação inválido", ex.getMessage());
    }

    @Test
    @DisplayName("validarAnoFabricacao: menor que 1900 - lança exceção")
    void validarAnoFabricacao_menorQue1900_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarAnoFabricacao(1899));
        assertEquals("Ano de fabricação inválido", ex.getMessage());
    }

    @Test
    @DisplayName("validarAnoFabricacao: maior que 2100 - lança exceção")
    void validarAnoFabricacao_maiorQue2100_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarAnoFabricacao(2101));
        assertEquals("Ano de fabricação inválido", ex.getMessage());
    }

    @Test
    @DisplayName("validarAnoFabricacao: igual a 1900 - válido")
    void validarAnoFabricacao_igualA1900_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarAnoFabricacao(1900));
    }

    @Test
    @DisplayName("validarAnoFabricacao: igual a 2100 - válido")
    void validarAnoFabricacao_igualA2100_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarAnoFabricacao(2100));
    }

    @Test
    @DisplayName("validarAnoFabricacao: ano corrente - válido")
    void validarAnoFabricacao_anoCorrente_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarAnoFabricacao(2024));
    }

    // ==================== validarQuilometragem ====================

    @Test
    @DisplayName("validarQuilometragem: negativa - lança exceção com mensagem correta")
    void validarQuilometragem_negativa_lancaExcecao() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> validator.validarQuilometragem(-1L));
        assertEquals("Quilometragem não pode ser negativa", ex.getMessage());
    }

    @Test
    @DisplayName("validarQuilometragem: zero - não lança exceção")
    void validarQuilometragem_zero_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarQuilometragem(0L));
    }

    @Test
    @DisplayName("validarQuilometragem: positiva - não lança exceção")
    void validarQuilometragem_positiva_naoLancaExcecao() {
        assertDoesNotThrow(() -> validator.validarQuilometragem(50000L));
    }
}
