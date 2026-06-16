package com.rotalog.service;

import com.rotalog.dto.EstatisticasFrotaResponse;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VeiculoEstatisticasService - Testes Unitários")
class VeiculoEstatisticasServiceTest {

    @Mock
    private VeiculoRepository veiculoRepository;

    @InjectMocks
    private VeiculoEstatisticasService estatisticasService;

    @Test
    @DisplayName("obterEstatisticas: retorna DTO tipado com contagens do repositório")
    void obterEstatisticas_retornaDtoComContagensCorretas() {
        when(veiculoRepository.count()).thenReturn(10L);
        when(veiculoRepository.countByStatus("ATIVO")).thenReturn(6L);
        when(veiculoRepository.countByStatus("INATIVO")).thenReturn(3L);
        when(veiculoRepository.countByStatus("MANUTENCAO")).thenReturn(1L);

        EstatisticasFrotaResponse resultado = estatisticasService.obterEstatisticas();

        assertNotNull(resultado);
        assertEquals(10L, resultado.getTotal());
        assertEquals(6L, resultado.getAtivos());
        assertEquals(3L, resultado.getInativos());
        assertEquals(1L, resultado.getEmManutencao());
    }

    @Test
    @DisplayName("obterEstatisticas: todos zerados - retorna DTO com zeros")
    void obterEstatisticas_todosZerados_retornaDtoComZeros() {
        when(veiculoRepository.count()).thenReturn(0L);
        when(veiculoRepository.countByStatus("ATIVO")).thenReturn(0L);
        when(veiculoRepository.countByStatus("INATIVO")).thenReturn(0L);
        when(veiculoRepository.countByStatus("MANUTENCAO")).thenReturn(0L);

        EstatisticasFrotaResponse resultado = estatisticasService.obterEstatisticas();

        assertNotNull(resultado);
        assertEquals(0L, resultado.getTotal());
        assertEquals(0L, resultado.getAtivos());
        assertEquals(0L, resultado.getInativos());
        assertEquals(0L, resultado.getEmManutencao());
    }

    @Test
    @DisplayName("obterEstatisticas: usa count queries, não findByStatus")
    void obterEstatisticas_usaCountQueries() {
        when(veiculoRepository.count()).thenReturn(5L);
        when(veiculoRepository.countByStatus(anyString())).thenReturn(1L);

        estatisticasService.obterEstatisticas();

        verify(veiculoRepository).count();
        verify(veiculoRepository).countByStatus("ATIVO");
        verify(veiculoRepository).countByStatus("INATIVO");
        verify(veiculoRepository).countByStatus("MANUTENCAO");
        verify(veiculoRepository, never()).findByStatus(anyString());
    }
}
