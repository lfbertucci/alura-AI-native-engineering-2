-- RotaLog - Migration: adicionar motorista_nome e veiculo_modelo na tabela entregas
-- Este script é idempotente (pode ser executado múltiplas vezes)
-- Executar após os scripts 01-07

SET search_path TO entregas;

-- Adicionar colunas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'entregas' AND table_name = 'entregas' AND column_name = 'motorista_nome') THEN
        ALTER TABLE entregas ADD COLUMN motorista_nome VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'entregas' AND table_name = 'entregas' AND column_name = 'veiculo_modelo') THEN
        ALTER TABLE entregas ADD COLUMN veiculo_modelo VARCHAR(100);
    END IF;
END $$;

-- Backfill: popular motorista_nome e veiculo_modelo nos registros existentes
-- FIXME: dados denormalizados - deveria consultar api-frotas

-- Motoristas (baseado no motorista_id do seed de frotas)
UPDATE entregas SET motorista_nome = 'Carlos Eduardo Santos' WHERE motorista_id = 1 AND motorista_nome IS NULL;
UPDATE entregas SET motorista_nome = 'Ana Paula Oliveira' WHERE motorista_id = 2 AND motorista_nome IS NULL;
UPDATE entregas SET motorista_nome = 'Roberto Almeida Silva' WHERE motorista_id = 3 AND motorista_nome IS NULL;
UPDATE entregas SET motorista_nome = 'Fernanda Costa Lima' WHERE motorista_id = 4 AND motorista_nome IS NULL;
UPDATE entregas SET motorista_nome = 'José Ricardo Pereira' WHERE motorista_id = 5 AND motorista_nome IS NULL;
UPDATE entregas SET motorista_nome = 'Patrícia Mendes Rocha' WHERE motorista_id = 7 AND motorista_nome IS NULL;

-- Veículos (baseado no veiculo_placa do seed de frotas)
UPDATE entregas SET veiculo_modelo = 'Fiat Fiorino' WHERE veiculo_placa = 'ABC1D23' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'VW Delivery 9.170' WHERE veiculo_placa = 'DEF4G56' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'Mercedes Sprinter' WHERE veiculo_placa = 'GHI7J89' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'Iveco Daily 35S14' WHERE veiculo_placa = 'JKL3M45' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'VW Constellation 17.280' WHERE veiculo_placa = 'VWX9Y01' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'Scania R450' WHERE veiculo_placa = 'BCD2E34' AND veiculo_modelo IS NULL;
UPDATE entregas SET veiculo_modelo = 'Volvo FH 540' WHERE veiculo_placa = 'FGH5I67' AND veiculo_modelo IS NULL;

-- Verificação
SELECT numero_pedido, motorista_nome, veiculo_placa, veiculo_modelo, status 
FROM entregas 
ORDER BY id;
