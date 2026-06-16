package com.rotalog.repository;

import com.rotalog.domain.AlertaManutencao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * AlertaManutencaoRepository — acesso aos alertas de manutenção preventiva.
 */
@Repository
public interface AlertaManutencaoRepository extends JpaRepository<AlertaManutencao, Long> {

    /** Retorna o alerta mais recente do veículo, usado como baseline de tempo/km. */
    Optional<AlertaManutencao> findFirstByVeiculoIdOrderByDataAlertaDesc(Long veiculoId);

    /** Lista alertas filtrados por status, do mais recente ao mais antigo. */
    List<AlertaManutencao> findByStatusNotificacaoOrderByDataAlertaDesc(String status);

    /** Lista todos os alertas, do mais recente ao mais antigo. */
    List<AlertaManutencao> findAllByOrderByDataAlertaDesc();

    /** Retorna alertas cujo status está na lista informada (ex.: PENDENTE, FALHA). */
    List<AlertaManutencao> findByStatusNotificacaoIn(List<String> status);
}
