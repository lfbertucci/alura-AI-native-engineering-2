-- RotaLog - API Frotas: tabela de alertas de manutenção preventiva
-- Script idempotente (pode ser executado múltiplas vezes)
-- Executar após os scripts 01-08

SET search_path TO frotas;

CREATE TABLE IF NOT EXISTS alertas_manutencao (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL,
    quilometragem_alerta BIGINT,
    motivo VARCHAR(20),                                 -- KM | TEMPO
    data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_notificacao VARCHAR(20) DEFAULT 'PENDENTE',  -- ENVIADA | FALHA | PENDENTE
    notificacao_id BIGINT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alertas_veiculo ON alertas_manutencao(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_status ON alertas_manutencao(status_notificacao);
