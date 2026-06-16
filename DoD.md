## Definition of Done: Alerta de manutenção preventiva

### Critérios de aceite:

- rotalog-api-frotas: endpoint que verifica veiculo com Km > limite OU data > x meses
- rotalog-api-frotas: chamada HTTP para o rotalog-api-notificacoes quando encontrar veiculo elegível
- rotalog-api-notificacoes: endpoint que recebe pedido de alerta e envia e-mail para o gestor
- rotalog-api-notificacoes: retorna status da notificação (enviada/falha)
- rotalog-api-frotas: registra alerta no banco com status da notificação
- painel-admin: tela que lista alertas por filtro por status
- Testes: unitários em cada serviço + teste E2E do fluxo completo
- Comunicação: HTTP sincrona entre serviços
- Tratamento de falha: se o rotalog-api-notificacoes estiver fora, o alerta é registrado como status "pendente"