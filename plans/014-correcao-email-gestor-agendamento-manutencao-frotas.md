# Correção: gestor não recebe e-mail ao agendar manutenção preventiva

## Context

O gestor do Rotalog não recebe e-mails quando um veículo é cadastrado para manutenção. A
investigação mostrou que **a causa raiz está na API de frotas** (Java/Spring Boot), não na API
de notificações.

No fluxo de agendamento, `ManutencaoService.agendarManutencao()` (linhas 78-87) envia a
notificação `MANUTENCAO_AGENDADA` com o destinatário **hardcoded como `"oficina@rotalog.com"`**.
Por isso o gestor (`${rotalog.alerta.destinatario-gestor}` = `gestor@rotalog.com`) nunca recebe
o e-mail.

Evidências de que é um bug e não intenção:
- O método de **conclusão** na mesma classe (linha 154) notifica corretamente o gestor.
- Existe um método pronto e correto — `VeiculoNotificacaoService.notificarManutencaoAgendada()`
  (linhas 59-69) — que usa `destinatarioGestor` da config, mas **nunca é chamado** (código morto).

> O `EnviarEmail` simulado e a falha aleatória de 10% na API .NET de notificações são o mock do
> ambiente de estudo e afetam todos os tipos igualmente — não são a causa de o gestor
> especificamente não receber. Fora do escopo desta correção.

**Resultado esperado:** ao agendar manutenção, a notificação `MANUTENCAO_AGENDADA` é enviada
ao gestor configurado, reutilizando `VeiculoNotificacaoService`.

## Decisões (confirmadas com o usuário)

- Destinatário: **apenas o gestor** (substitui a oficina).
- Abordagem: **reusar `VeiculoNotificacaoService`**, centralizando a notificação e ativando o
  código hoje morto.

## Mudanças

### 1. `VeiculoNotificacaoService.java` — overload para agendamento manual
Arquivo: `rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoNotificacaoService.java`

O método existente `notificarManutencaoAgendada(Veiculo, Long kmLimite)` é voltado a alerta por
KM e não cabe no agendamento manual (que tem `tipoManutencao`/`descricao`, sem kmLimite).
Adicionar um overload que preserva a mensagem original do fluxo e usa `destinatarioGestor`:

```java
public void notificarManutencaoAgendada(Veiculo veiculo, String tipoManutencao) {
    try {
        notificacaoClient.enviarNotificacao(
            "MANUTENCAO_AGENDADA",
            destinatarioGestor,
            "Manutencao " + tipoManutencao + " agendada para veiculo " + veiculo.getPlaca()
        );
    } catch (Exception e) {
        log.error("Falha ao notificar agendamento de manutencao: {}", e.getMessage());
    }
}
```

Manter o overload `(Veiculo, Long kmLimite)` existente como está.

### 2. `ManutencaoService.java` — delegar a notificação
Arquivo: `rotalog-api-frotas/src/main/java/com/rotalog/service/ManutencaoService.java`

- Injetar `VeiculoNotificacaoService` (via `@Autowired`, seguindo o padrão atual da classe).
- Em `agendarManutencao()`, substituir o bloco hardcoded (linhas 78-87) pela delegação:

```java
// Notificar gestor sobre agendamento
veiculoNotificacaoService.notificarManutencaoAgendada(veiculo, tipoManutencao);
```

O `try/catch` deixa de ser necessário aqui porque o overload já trata a exceção internamente
(mesmo padrão de `notificarNovoVeiculo`/`notificarDesativacao`).

> Opcional (mesma pegada, fora do bug relatado): a notificação de **conclusão** (linhas 149-159)
> também usa `enviarNotificacao` inline com `gestor@rotalog.com` hardcoded. Não é necessário para
> corrigir este bug; deixar como está salvo pedido em contrário.

## Verificação

1. **Build:** compilar a API de frotas (`mvn -q -DskipTests compile` no diretório `rotalog-api-frotas`).
2. **Subir ambiente:** Postgres + APIs via Docker Compose do `rotalog-workspace`; frotas em `:8080`, notificações em `:5000`.
3. **Reproduzir o fluxo:** `POST /manutencoes` (frotas) com `tipoManutencao = "PREVENTIVA"` para um veículo existente.
4. **Confirmar destinatário:** verificar nos logs da API de notificações a linha `[EMAIL FAKE] Enviando para gestor@rotalog.com` (e não `oficina@rotalog.com`); e/ou `GET /api/notificacoes` no serviço .NET e checar que o registro `MANUTENCAO_AGENDADA` tem `destinatario = gestor@rotalog.com`.
5. **Confirmar config:** `rotalog.alerta.destinatario-gestor=gestor@rotalog.com` em `application.properties`.
