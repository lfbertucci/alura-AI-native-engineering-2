-- RotaLog - API Notificações Seed Data
-- Dados iniciais para desenvolvimento e testes

SET search_path TO notificacoes;

-- Templates de notificação
INSERT INTO templates_notificacao (tipo, canal, assunto_template, corpo_template, ativo) VALUES
('VEICULO_CADASTRADO', 'email', 'Novo veículo cadastrado: {{placa}}', 'Um novo veículo foi cadastrado no sistema RotaLog.\n\nPlaca: {{placa}}\nModelo: {{modelo}}\nAno: {{ano}}\n\nEquipe RotaLog', true),
('MANUTENCAO_AGENDADA', 'email', 'Manutenção agendada - Veículo {{placa}}', 'Uma manutenção foi agendada para o veículo {{placa}}.\n\nTipo: {{tipo_manutencao}}\nData: {{data_agendada}}\nDescrição: {{descricao}}\n\nEquipe RotaLog', true),
('ENTREGA_CRIADA', 'email', 'Nova entrega criada: {{numero_pedido}}', 'Uma nova entrega foi registrada no sistema.\n\nPedido: {{numero_pedido}}\nOrigem: {{origem}}\nDestino: {{destino}}\n\nEquipe RotaLog', true),
('STATUS_ENTREGA', 'email', 'Atualização de entrega: {{numero_pedido}}', 'O status da entrega {{numero_pedido}} foi atualizado.\n\nStatus anterior: {{status_anterior}}\nNovo status: {{status_novo}}\n\nEquipe RotaLog', true),
('ENTREGA_CONCLUIDA', 'email', 'Entrega concluída: {{numero_pedido}}', 'Sua entrega {{numero_pedido}} foi concluída com sucesso!\n\nDestino: {{destino}}\nData de entrega: {{data_entrega}}\n\nObrigado por usar o RotaLog!', true),
('ENTREGA_ATRASADA', 'email', 'ALERTA: Entrega atrasada - {{numero_pedido}}', 'ATENÇÃO: A entrega {{numero_pedido}} está atrasada.\n\nDestino: {{destino}}\nTempo estimado: {{tempo_estimado}} min\n\nVerifique a situação imediatamente.\n\nEquipe RotaLog', true),
('CNH_VENCIDA', 'email', 'ALERTA: CNH vencida - Motorista {{nome}}', 'ATENÇÃO: A CNH do motorista {{nome}} está vencida.\n\nVencimento: {{data_vencimento}}\nCNH: {{numero_cnh}}\n\nO motorista deve ser afastado até regularização.\n\nEquipe RotaLog', true),
('VEICULO_DESATIVADO', 'email', 'Veículo desativado: {{placa}}', 'O veículo {{placa}} foi desativado no sistema.\n\nMotivo: {{motivo}}\nData: {{data}}\n\nEquipe RotaLog', true),
('ALERTA_MANUTENCAO', 'sms', NULL, 'RotaLog: Manutenção agendada para veículo {{placa}} em {{data_agendada}}. Verifique o sistema.', true),
('ENTREGA_CONCLUIDA', 'sms', NULL, 'RotaLog: Sua entrega {{numero_pedido}} foi entregue com sucesso!', true);

-- Notificações de exemplo (histórico)
INSERT INTO notificacoes (tipo, canal, destinatario, assunto, mensagem, status, tentativas, servico_origem, referencia_id, data_criacao, data_envio, data_atualizacao) VALUES
('VEICULO_CADASTRADO', 'email', 'operacao@rotalog.com', 'Novo veículo cadastrado: ABC1D23', 'Um novo veículo foi cadastrado no sistema RotaLog.\n\nPlaca: ABC1D23\nModelo: Fiat Fiorino\nAno: 2020\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-frotas', 'veiculo-1', '2024-01-10 08:00:00', '2024-01-10 08:00:05', '2024-01-10 08:00:05'),
('ENTREGA_CRIADA', 'email', 'operacao@rotalog.com', 'Nova entrega criada: PED-2024-001', 'Uma nova entrega foi registrada no sistema.\n\nPedido: PED-2024-001\nOrigem: Rua Augusta, 1500\nDestino: Av. Paulista, 1000\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-entregas', 'entrega-1', '2024-01-15 08:00:00', '2024-01-15 08:00:03', '2024-01-15 08:00:03'),
('STATUS_ENTREGA', 'email', 'operacao@rotalog.com', 'Atualização de entrega: PED-2024-001', 'O status da entrega PED-2024-001 foi atualizado.\n\nStatus anterior: ATRIBUIDA\nNovo status: EM_TRANSITO\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-entregas', 'entrega-1', '2024-01-15 09:00:00', '2024-01-15 09:00:02', '2024-01-15 09:00:02'),
('ENTREGA_CONCLUIDA', 'email', 'cliente@rotalog.com', 'Entrega concluída: PED-2024-001', 'Sua entrega PED-2024-001 foi concluída com sucesso!\n\nDestino: Av. Paulista, 1000\nData de entrega: 2024-01-15 10:30\n\nObrigado por usar o RotaLog!', 'ENVIADO', 1, 'api-entregas', 'entrega-1', '2024-01-15 10:30:00', '2024-01-15 10:30:04', '2024-01-15 10:30:04'),
('MANUTENCAO_AGENDADA', 'email', 'frota@rotalog.com', 'Manutenção agendada - Veículo ABC1D23', 'Uma manutenção foi agendada para o veículo ABC1D23.\n\nTipo: Revisão\nData: 2024-02-15\nDescrição: Revisão dos 30.000km\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-frotas', 'manutencao-1', '2024-02-01 10:00:00', '2024-02-01 10:00:06', '2024-02-01 10:00:06'),
('ENTREGA_ATRASADA', 'email', 'gestor@rotalog.com', 'ALERTA: Entrega atrasada - PED-2024-003', 'ATENÇÃO: A entrega PED-2024-003 está atrasada.\n\nDestino: Av. Faria Lima, 3000\nTempo estimado: 25 min\n\nVerifique a situação imediatamente.\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-entregas', 'entrega-3', '2024-02-10 12:00:00', '2024-02-10 12:00:03', '2024-02-10 12:00:03'),
('CNH_VENCIDA', 'email', 'rh@rotalog.com', 'ALERTA: CNH vencida - Motorista Fernanda Costa Lima', 'ATENÇÃO: A CNH do motorista Fernanda Costa Lima está vencida.\n\nVencimento: 2024-01-05\nCNH: 45678901234\n\nO motorista deve ser afastado até regularização.\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-frotas', 'motorista-4', '2024-02-20 08:00:00', '2024-02-20 08:00:05', '2024-02-20 08:00:05'),
('ENTREGA_CRIADA', 'email', 'operacao@rotalog.com', 'Nova entrega criada: PED-2024-010', 'Uma nova entrega foi registrada no sistema.\n\nPedido: PED-2024-010\nOrigem: Rua Teodoro Sampaio, 1200\nDestino: Av. Sumaré, 300\n\nEquipe RotaLog', 'FALHA', 3, 'api-entregas', 'entrega-10', '2024-03-15 08:00:00', NULL, '2024-03-15 08:01:30'),
('VEICULO_DESATIVADO', 'email', 'frota@rotalog.com', 'Veículo desativado: RST6U78', 'O veículo RST6U78 foi desativado no sistema.\n\nMotivo: Fim de vida útil\nData: 2024-01-10\n\nEquipe RotaLog', 'ENVIADO', 1, 'api-frotas', 'veiculo-6', '2024-01-10 14:00:00', '2024-01-10 14:00:04', '2024-01-10 14:00:04'),
('ALERTA_MANUTENCAO', 'sms', '+5511999990001', NULL, 'RotaLog: Manutenção agendada para veículo DEF4G56 em 2024-03-20. Verifique o sistema.', 'PENDENTE', 0, 'api-frotas', 'manutencao-3', '2024-03-18 09:00:00', NULL, '2024-03-18 09:00:00');

-- FIXME: Seed data não é idempotente
-- FIXME: Sem verificação de duplicidade
