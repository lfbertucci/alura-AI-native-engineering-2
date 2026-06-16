package com.rotalog.service;

import com.rotalog.domain.Veiculo;
import com.rotalog.repository.VeiculoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * VeiculoService - Coordenador de CRUD de veículos.
 * Delega validação, notificação e manutenção preventiva a colaboradores coesos.
 */
@Slf4j
@Service
public class VeiculoService {

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Autowired
    private VeiculoValidator validator;

    @Autowired
    private VeiculoNotificacaoService notificacaoService;

    @Autowired
    private ManutencaoPreventivaService manutencaoPreventivaService;

    public List<Veiculo> listarTodos() {
        log.info("Listando todos os veículos");
        return veiculoRepository.findAll();
    }

    public Veiculo buscarPorId(Long id) {
        return veiculoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado: " + id));
    }

    public Veiculo buscarPorPlaca(String placa) {
        return veiculoRepository.findByPlaca(placa)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado com placa: " + placa));
    }

    public Veiculo registrarVeiculo(String placa, String modelo, Integer anoFabricacao) {
        validator.validarPlaca(placa);

        Optional<Veiculo> existente = veiculoRepository.findByPlaca(placa);
        if (existente.isPresent()) {
            throw new RuntimeException("Veículo com placa " + placa + " já existe");
        }

        validator.validarModelo(modelo);
        validator.validarAnoFabricacao(anoFabricacao);

        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca(placa.toUpperCase());
        veiculo.setModelo(modelo);
        veiculo.setAnoFabricacao(anoFabricacao);
        veiculo.setStatus("ATIVO");
        veiculo.setQuilometragem(0L);
        veiculo.setDataCadastro(LocalDateTime.now());
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo salvo = veiculoRepository.save(veiculo);
        log.info("Veículo registrado: {} - {}", salvo.getPlaca(), salvo.getModelo());

        notificacaoService.notificarNovoVeiculo(salvo);

        return salvo;
    }

    public Veiculo atualizarVeiculo(Long id, String modelo, Integer anoFabricacao, Long quilometragem) {
        Veiculo veiculo = buscarPorId(id);

        if (modelo != null && !modelo.isEmpty()) {
            veiculo.setModelo(modelo);
        }
        if (anoFabricacao != null) {
            veiculo.setAnoFabricacao(anoFabricacao);
        }
        if (quilometragem != null) {
            if (quilometragem < veiculo.getQuilometragem()) {
                log.warn("Tentativa de reduzir quilometragem do veículo {}: {} -> {}",
                        id, veiculo.getQuilometragem(), quilometragem);
            }
            veiculo.setQuilometragem(quilometragem);
        }

        veiculo.setDataAtualizacao(LocalDateTime.now());
        return veiculoRepository.save(veiculo);
    }

    public Veiculo atualizarQuilometragem(Long veiculoId, Long novaQuilometragem) {
        Veiculo veiculo = buscarPorId(veiculoId);

        validator.validarQuilometragem(novaQuilometragem);

        if (novaQuilometragem < veiculo.getQuilometragem()) {
            log.warn("Quilometragem informada ({}) é menor que a atual ({})", novaQuilometragem, veiculo.getQuilometragem());
        }

        veiculo.setQuilometragem(novaQuilometragem);
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo atualizado = veiculoRepository.save(veiculo);

        manutencaoPreventivaService.verificarEAlertar(atualizado);

        return atualizado;
    }

    public List<Veiculo> obterVeiculosPorStatus(String status) {
        if (!status.equals("ATIVO") && !status.equals("INATIVO") && !status.equals("MANUTENCAO")) {
            throw new RuntimeException("Status inválido: " + status);
        }
        return veiculoRepository.findByStatus(status);
    }

    public Veiculo desativarVeiculo(Long veiculoId) {
        Veiculo veiculo = buscarPorId(veiculoId);
        veiculo.setStatus("INATIVO");
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo desativado = veiculoRepository.save(veiculo);
        log.info("Veículo desativado: {}", veiculo.getPlaca());

        notificacaoService.notificarDesativacao(veiculo);

        return desativado;
    }

    public Veiculo reativarVeiculo(Long veiculoId) {
        Veiculo veiculo = buscarPorId(veiculoId);
        veiculo.setStatus("ATIVO");
        veiculo.setDataAtualizacao(LocalDateTime.now());

        log.info("Veículo reativado: {}", veiculo.getPlaca());
        return veiculoRepository.save(veiculo);
    }

    public void sincronizarComSistemaExterno() {
        log.info("Sincronização com sistema externo iniciada");
        // TODO: Implementar integração real
        // TODO: Adicionar retry logic
        // TODO: Adicionar circuit breaker
    }
}
