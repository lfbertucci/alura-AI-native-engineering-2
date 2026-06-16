package com.rotalog.scheduler;

import com.rotalog.domain.Veiculo;
import com.rotalog.repository.VeiculoRepository;
import com.rotalog.service.ManutencaoPreventivaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AlertaManutencaoScheduler - Testes Unitarios")
class AlertaManutencaoSchedulerTest {

    @Mock
    private ManutencaoPreventivaService manutencaoPreventivaService;

    @Mock
    private VeiculoRepository veiculoRepository;

    @InjectMocks
    private AlertaManutencaoScheduler scheduler;

    // -------------------------------------------------------------------------
    // executar
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("executar: chama reprocessarPendentes e verificarEAlertar para cada veiculo ativo na ordem correta")
    void executar_comVeiculosAtivos_reprocessaDepoisVarreEmOrdem() {
        Veiculo v1 = veiculoAtivo(1L, "AAA0001");
        Veiculo v2 = veiculoAtivo(2L, "BBB0002");

        when(veiculoRepository.findByStatus("ATIVO")).thenReturn(Arrays.asList(v1, v2));

        scheduler.executar();

        InOrder inOrder = inOrder(manutencaoPreventivaService, veiculoRepository);
        inOrder.verify(manutencaoPreventivaService).reprocessarPendentes();
        inOrder.verify(veiculoRepository).findByStatus("ATIVO");
        inOrder.verify(manutencaoPreventivaService).verificarEAlertar(v1);
        inOrder.verify(manutencaoPreventivaService).verificarEAlertar(v2);
    }

    @Test
    @DisplayName("executar: lista de ativos vazia - reprocessa mas nunca chama verificarEAlertar")
    void executar_semVeiculosAtivos_reprocessaSemChamarVerificar() {
        when(veiculoRepository.findByStatus("ATIVO")).thenReturn(Collections.emptyList());

        scheduler.executar();

        verify(manutencaoPreventivaService).reprocessarPendentes();
        verify(manutencaoPreventivaService, never()).verificarEAlertar(any());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Veiculo veiculoAtivo(Long id, String placa) {
        Veiculo v = new Veiculo();
        v.setId(id);
        v.setPlaca(placa);
        v.setStatus("ATIVO");
        return v;
    }
}
