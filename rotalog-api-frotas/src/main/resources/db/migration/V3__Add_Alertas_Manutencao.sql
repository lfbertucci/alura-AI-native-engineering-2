-- V3: Adiciona tabela de alertas de manutenção preventiva
-- Espelho do script 09-add-alertas-manutencao.sql (Flyway desabilitado; schema gerenciado pelo docker-compose)

CREATE TABLE frotas.alertas_manutencao (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL,
    quilometragem_alerta BIGINT,
    motivo VARCHAR(20),                                 -- KM | TEMPO
    data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_notificacao VARCHAR(20) DEFAULT 'PENDENTE',  -- ENVIADA | FALHA | PENDENTE
    notificacao_id BIGINT,                              -- id retornado pela api-notificacoes
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alertas_veiculo ON frotas.alertas_manutencao(veiculo_id);
CREATE INDEX idx_alertas_status ON frotas.alertas_manutencao(status_notificacao);
