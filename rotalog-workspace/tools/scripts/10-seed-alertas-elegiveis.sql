-- RotaLog - Seed: veículos elegíveis para alerta de manutenção preventiva
-- Script idempotente (pode ser executado múltiplas vezes)
-- Executar após o script 09

SET search_path TO frotas;

INSERT INTO veiculos (placa, modelo, ano_fabricacao, quilometragem, status, data_cadastro, data_atualizacao) VALUES
('MNT0A01', 'Demo Elegível KM',    2021, 80000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0B02', 'Demo Elegível Tempo', 2022, 30000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0C03', 'Demo Elegível Ambos', 2019, 120000, 'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0D04', 'Demo Não Elegível',   2023, 50000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00')
ON CONFLICT (placa) DO NOTHING;

INSERT INTO manutencoes (veiculo_id, tipo_manutencao, data_manutencao, quilometragem_manutencao, custo, descricao, status, data_criacao, data_atualizacao)
SELECT v.id, 'PREVENTIVA', m.data_manut, m.km_manut, 700.00, m.descricao, 'CONCLUIDA', m.data_manut, m.data_manut
FROM (VALUES
    ('MNT0A01', TIMESTAMP '2026-05-20 08:00:00', 65000,  'Seed elegibilidade - baseline KM'),
    ('MNT0B02', TIMESTAMP '2025-06-01 08:00:00', 28000,  'Seed elegibilidade - baseline TEMPO'),
    ('MNT0C03', TIMESTAMP '2024-01-10 08:00:00', 100000, 'Seed elegibilidade - baseline AMBOS'),
    ('MNT0D04', TIMESTAMP '2026-06-01 08:00:00', 49000,  'Seed elegibilidade - controle negativo')
) AS m(placa, data_manut, km_manut, descricao)
JOIN veiculos v ON v.placa = m.placa
WHERE NOT EXISTS (
    SELECT 1 FROM manutencoes mx WHERE mx.veiculo_id = v.id AND mx.descricao = m.descricao
);

-- Verificação
SELECT v.placa, v.quilometragem, m.quilometragem_manutencao, m.data_manutencao, m.descricao
FROM veiculos v JOIN manutencoes m ON m.veiculo_id = v.id
WHERE v.placa LIKE 'MNT0%' ORDER BY v.placa;
