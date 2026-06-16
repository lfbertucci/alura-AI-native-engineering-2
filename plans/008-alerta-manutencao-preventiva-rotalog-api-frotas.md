# Plano 008: Alerta de Manutenção Preventiva — rotalog-api-frotas

> Parte 1 de 3 do recurso "Alerta de manutenção preventiva" (ver `DoD.md`).
> Planos relacionados: `009-...-rotalog-api-notificacoes`, `010-...-painel-admin`.

## Contexto

O Rotalog já tem um esboço **reativo** e incompleto de manutenção preventiva:
[ManutencaoPreventivaService.precisaDeManutencao()](../rotalog-api-frotas/src/main/java/com/rotalog/service/ManutencaoPreventivaService.java)
usa um limite fixo de `50000` km e só é avaliado quando a quilometragem é atualizada manualmente em
[VeiculoService.atualizarQuilometragem()](../rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoService.java).

Este plano implementa, no serviço de frotas, o alerta de manutenção preventiva conforme o `DoD.md`:
disparo por **intervalo de KM OU de tempo desde a última manutenção, o que vier primeiro**
(ex.: 10.000 km ou 6 meses), com **reset dos contadores ao disparar**, acionado por **job agendado**
e por **endpoint sob demanda**; chamada **HTTP síncrona** para a api-notificacoes; **persistência do
alerta com o status da notificação**; e, se a api-notificacoes estiver fora, o alerta é gravado como
**PENDENTE**.

### Regra e o "reset dos contadores"
Para cada veículo ATIVO, **baseline** = o mais recente entre:
- última `manutencao` com status `CONCLUIDA` → `(quilometragem_manutencao, data_manutencao)`
- último `alerta_manutencao` já disparado → `(quilometragem_alerta, data_alerta)`
- fallback: `(0, veiculo.data_cadastro)`

Dispara se `km_atual - baseline_km >= INTERVALO_KM` **OU** `hoje - baseline_data >= INTERVALO_MESES`.
Ao disparar, grava-se um `alerta_manutencao` com KM/data atuais — ele **vira a nova baseline**,
zerando ("resetando") ambos os contadores e servindo de de-duplicação por período.

## Mudanças

### 1. Nova tabela `frotas.alertas_manutencao`
Script autoritativo (aplicado pelo docker-compose, schema gerenciado fora do app):
`../rotalog-workspace/tools/scripts/09-add-alertas-manutencao.sql`.
Como `spring.jpa.hibernate.ddl-auto=validate`, a tabela **precisa existir antes** do app subir.
Espelhar para documentação em `../rotalog-api-frotas/src/main/resources/db/migration/V3__Add_Alertas_Manutencao.sql` (Flyway está desabilitado).

```sql
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
```

### 2. Domínio + repositório
- `domain/AlertaManutencao.java` — entidade JPA no padrão de [Manutencao.java](../rotalog-api-frotas/src/main/java/com/rotalog/domain/Manutencao.java) (Lombok `@Getter/@Setter/@NoArgsConstructor`, `@GeneratedValue(IDENTITY)`).
- `repository/AlertaManutencaoRepository.java` (`JpaRepository<AlertaManutencao, Long>`):
  - `findFirstByVeiculoIdOrderByDataAlertaDesc(Long veiculoId)` — baseline de alerta.
  - `findByStatusNotificacaoOrderByDataAlertaDesc(String status)` — listagem filtrada.
  - `findAllByOrderByDataAlertaDesc()` — listagem sem filtro.
  - `findByStatusNotificacaoIn(List<String> status)` — reprocessar PENDENTE/FALHA.

### 3. Configuração — [application.properties](../rotalog-api-frotas/src/main/resources/application.properties)
```
rotalog.manutencao.intervalo-km=10000
rotalog.manutencao.intervalo-meses=6
rotalog.manutencao.alerta.cron=0 0 6 * * *
rotalog.api.notificacoes.url=http://localhost:5000
rotalog.alerta.destinatario-gestor=gestor@rotalog.com
```

### 4. `NotificacaoClient` — capturar status e tratar serviço fora do ar
Hoje [enviarNotificacao()](../rotalog-api-frotas/src/main/java/com/rotalog/service/NotificacaoClient.java) ignora a resposta e **re-lança** exceção. Mudar para:
- Método que **retorna o status**: `POST /api/notificacoes`, lê o corpo (`status` = `ENVIADO`/`FALHA`/`PENDENTE` e `id`), normaliza para `ENVIADA`/`FALHA`, retorna um resultado `{ status, notificacaoId }`.
- Falha de conexão (serviço fora/timeout): **não propagar** — retornar `status=PENDENTE` (DoD).
- Ler a URL base de `rotalog.api.notificacoes.url` (remover hardcode).

### 5. Reescrever `ManutencaoPreventivaService`
Injetar `ManutencaoRepository`, `AlertaManutencaoRepository`, `VeiculoRepository`, `VeiculoNotificacaoService` e os `@Value` dos intervalos.
- Substituir `precisaDeManutencao` pela regra de baseline (KM **ou** tempo); auxiliar `avaliar(veiculo)` retorna se dispara e o `motivo` (`KM`/`TEMPO`). Usa [ManutencaoRepository.findUltimaManutencao()](../rotalog-api-frotas/src/main/java/com/rotalog/repository/ManutencaoRepository.java) (status `CONCLUIDA`) e `findFirstByVeiculoIdOrderByDataAlertaDesc`.
- `verificarEAlertar(Veiculo veiculo)`: se elegível, **(1)** grava `AlertaManutencao` com `status_notificacao=PENDENTE` (baseline registrada mesmo se a notificação falhar); **(2)** chama o client e obtém o status; **(3)** atualiza `status_notificacao` + `notificacao_id`.
- `reprocessarPendentes()`: reenvia alertas `PENDENTE`/`FALHA` e atualiza o status (recupera quando a api-notificacoes volta).
- Manter `calcularCustoManutencao`.

### 6. Notificação ao gestor — `VeiculoNotificacaoService`
Reusar [notificarAlertaManutencao](../rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoNotificacaoService.java) com overload incluindo `motivo`, **retornando o status** do `NotificacaoClient`. Mantém tipo `ALERTA_MANUTENCAO`, canal `email`, destinatário gestor (template existe no seed da api-notificacoes).

### 7. Disparo automático (job) + on-demand + listagem
- [Application.java](../rotalog-api-frotas/src/main/java/com/rotalog/Application.java): adicionar `@EnableScheduling`.
- `scheduler/AlertaManutencaoScheduler.java` (`@Component`, `@Scheduled(cron="${rotalog.manutencao.alerta.cron}")`): chama `reprocessarPendentes()` e roda `verificarEAlertar` para cada veículo ATIVO ([VeiculoRepository.findByStatus("ATIVO")](../rotalog-api-frotas/src/main/java/com/rotalog/repository/VeiculoRepository.java)).
- `controller/AlertaManutencaoController.java` (`@RequestMapping("/alertas-manutencao")` → `/api/alertas-manutencao`):
  - `GET /?status=` → lista alertas (`AlertaManutencaoResponse`), filtrável por status.
  - `POST /verificar` → roda a varredura na hora e retorna os alertas gerados.
- `dto/AlertaManutencaoResponse.java` — `id, veiculoId, placa, modelo, quilometragemAlerta, motivo, dataAlerta, statusNotificacao` (service resolve placa/modelo via `VeiculoRepository`).

### 8. Unificar o caminho reativo
Em [VeiculoService.atualizarQuilometragem()](../rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoService.java), trocar a chamada direta por `verificarEAlertar(veiculo)`, para KM-update e job usarem a **mesma** regra com dedup/reset.

## Testes (JUnit 5 + Mockito)

Arquivo novo: `rotalog-api-frotas/src/test/java/com/rotalog/service/ManutencaoPreventivaServiceTest.java`
- `@ExtendWith(MockitoExtension.class)`, mocks de `ManutencaoRepository`, `AlertaManutencaoRepository`, `VeiculoRepository`, `VeiculoNotificacaoService`; `@InjectMocks` no service; intervalos setados via reflexão (`ReflectionTestUtils`).
- Casos:
  - **dispara por KM** (km desde baseline ≥ intervalo) → grava alerta + notifica.
  - **dispara por TEMPO** (meses desde baseline ≥ intervalo, km abaixo) → grava + notifica.
  - **não dispara** dentro do intervalo de KM e de tempo (baseline = alerta/manutenção recente).
  - **notificacoes fora → PENDENTE**: client retorna `PENDENTE` → alerta salvo com `status_notificacao=PENDENTE` (verifica que **não** lança exceção).
  - **status ENVIADA**: client retorna `ENVIADA` → alerta atualizado com id da notificação.
  - **reprocessarPendentes**: alerta `PENDENTE`/`FALHA` é reenviado e atualizado.
  - baseline usa o **mais recente** entre última manutenção CONCLUIDA e último alerta.

Opcional: `NotificacaoClientTest` com `MockRestServiceServer` (status do corpo; conexão recusada → `PENDENTE`).

## Verificação

1. Aplicar `09-add-alertas-manutencao.sql` (recriar o banco via docker-compose com volume limpo, ou rodar o script no Postgres). Sem a tabela o app não sobe (`ddl-auto=validate`).
2. `mvn -f rotalog-api-frotas/pom.xml test` → todos verdes.
3. Subir frotas (8080) e a api-notificacoes (5000); `POST /api/alertas-manutencao/verificar`. Com o seed (manutenções de 2024) a maioria dispara por **TEMPO**; conferir `status_notificacao=ENVIADA`.
4. **Falha (DoD):** derrubar a api-notificacoes e rodar `/verificar` → alertas `PENDENTE`. Subir e rodar de novo → reprocessados para `ENVIADA`.
5. **Dedup/reset:** repetir `/verificar` → nenhum alerta novo no mesmo período.
6. `GET /api/alertas-manutencao?status=PENDENTE` retorna só os pendentes.
