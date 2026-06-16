# Plano: Testes para a feature de Manutenção Preventiva (rotalog-api-frotas)

## Contexto

A feature de manutenção preventiva do serviço Java/Spring Boot `rotalog-api-frotas`
dispara alertas de manutenção (por KM rodado ou por tempo) e gerencia o ciclo de vida
de manutenções (agendar → iniciar → concluir/cancelar). Hoje apenas o núcleo
`ManutencaoPreventivaService` está coberto (13 testes em
`ManutencaoPreventivaServiceTest`). Estão **sem nenhum teste**:

- `AlertaManutencaoScheduler` (varredura diária)
- `AlertaManutencaoController` e `ManutencaoController` (endpoints REST)
- `ManutencaoService` (ciclo de vida — e o `concluirManutencao` define o baseline
  preventivo via status `CONCLUIDA`, logo é parte do mesmo fluxo)

Além disso, o teste existente do serviço tem lacunas de borda (limites exatos, valores
nulos, baseline com ambas as fontes nulas).

Objetivo: elevar a cobertura da feature com **testes unitários** (Mockito puro, padrão
atual do repo) para serviços/scheduler e **testes de fatia web** (`@WebMvcTest` +
MockMvc) para os controllers — conforme decidido com o usuário ("criar os 2 tipos" e
incluir o ciclo de vida).

## Convenções a seguir (já estabelecidas no repo)

- JUnit 5 + `@ExtendWith(MockitoExtension.class)`, `@Mock` / `@InjectMocks`.
- `@DisplayName` em português no padrão `"metodo: contexto - comportamento esperado"`.
- `ReflectionTestUtils.setField(...)` para injetar `@Value` (`intervaloKm`,
  `intervaloMeses`, `destinatarioGestor`).
- `ArgumentCaptor` para inspecionar o que é salvo; `verify(...)` / `never()` /
  `verifyNoInteractions(...)`.
- Stack de teste vem só de `spring-boot-starter-test` (JUnit 5, Mockito, AssertJ,
  MockMvc, Jackson). **Não há H2, Testcontainers nem `src/test/resources`** — nenhum
  teste toca banco real. `@WebMvcTest` não sobe banco (deps são mockadas com `@MockBean`).

## Arquivos novos

Todos em `rotalog-api-frotas/src/test/java/com/rotalog/...`.

### Testes unitários (Mockito puro)

1. **`service/ManutencaoServiceTest.java`** — mocka `ManutencaoRepository`,
   `VeiculoRepository`, `NotificacaoClient`; `@InjectMocks ManutencaoService`. Casos:
   - `agendarManutencao`: sucesso (salva com status `PENDENTE`, km do veículo, notifica
     `MANUTENCAO_AGENDADA`); veículo inexistente → `RuntimeException`; `tipoManutencao`
     nulo/vazio → `RuntimeException`; falha do `notificacaoClient` não propaga (capturada).
   - `iniciarManutencao`: PENDENTE → `EM_ANDAMENTO` e veículo → `MANUTENCAO`; quando não
     está PENDENTE, ainda transiciona (apenas loga warn — comportamento atual).
   - `concluirManutencao`: → `CONCLUIDA`, aplica `custoFinal` (e ignora quando nulo,
     mantendo custo), reativa veículo (`ATIVO`), notifica `MANUTENCAO_CONCLUIDA`; veículo
     nulo → placa "N/A" sem quebrar.
   - `cancelarManutencao`: → `CANCELADA`; reativa veículo só se estava `MANUTENCAO`.
   - `buscarPorId` / `obterUltimaManutencao`: `RuntimeException` quando não encontrado.
   - Usar `ArgumentCaptor<Manutencao>` e `<Veiculo>` para validar status/datas salvos.

2. **`scheduler/AlertaManutencaoSchedulerTest.java`** — mocka
   `ManutencaoPreventivaService` e `VeiculoRepository`; `@InjectMocks` scheduler. Casos:
   - `executar`: chama `reprocessarPendentes()` uma vez, busca `findByStatus("ATIVO")` e
     chama `verificarEAlertar(...)` para **cada** veículo ativo (verificar ordem com
     `InOrder`: reprocessar antes da varredura).
   - Lista de ativos vazia → reprocessa mas nunca chama `verificarEAlertar`.

### Testes de fatia web (`@WebMvcTest` + MockMvc) — o tipo "integrado"

3. **`controller/AlertaManutencaoControllerTest.java`** —
   `@WebMvcTest(AlertaManutencaoController.class)`, `@Autowired MockMvc`,
   `@MockBean` para `AlertaManutencaoRepository`, `VeiculoRepository`,
   `ManutencaoPreventivaService`. Casos:
   - `GET /alertas-manutencao` sem `status` → usa `findAllByOrderByDataAlertaDesc`,
     200 + JSON com `placa`/`modelo` resolvidos do veículo.
   - `GET /alertas-manutencao?status=PENDENTE` → usa
     `findByStatusNotificacaoOrderByDataAlertaDesc("PENDENTE")`.
   - Enriquecimento: veículo inexistente em `toResponseList` → `placa`/`modelo` = "N/A".
   - `POST /alertas-manutencao/verificar` → chama `reprocessarPendentes`, varre ativos e
     retorna no corpo apenas os alertas gerados (`verificarEAlertar` devolvendo
     `Optional`).
   - **Atenção ao path**: `@WebMvcTest` ignora o `server.servlet.context-path=/api`, então
     usar `"/alertas-manutencao"` (sem `/api`) no MockMvc.

4. **`controller/ManutencaoControllerTest.java`** —
   `@WebMvcTest(ManutencaoController.class)`, `@MockBean ManutencaoService`. Casos:
   - `GET /manutencoes` → 200 + lista (Jackson serializa `Manutencao`).
   - `GET /manutencoes/{id}` → 200; quando serviço lança `RuntimeException` → 404 com
     corpo `{"erro": ...}`.
   - `GET /manutencoes/veiculo/{id}` e `/pendentes` → 200.
   - `GET /manutencoes/veiculo/{id}/ultima` → 404 quando lança exceção.
   - `POST /manutencoes` → 201 com corpo serializado; exceção do serviço → 400 `{"erro"}`.
     Enviar `ManutencaoRequest` como JSON.
   - `PATCH /{id}/iniciar|concluir|cancelar` → 200; exceção → 400. Para `concluir`, enviar
     `{"custoFinal": ...}` e também caso sem `custoFinal` (passa `null`).

### Ampliação de teste existente

5. **`service/ManutencaoPreventivaServiceTest.java`** — acrescentar casos de borda
   (sem alterar os existentes):
   - Limite exato: `kmPercorrido == intervaloKm` (10000) → dispara `KM`;
     `mesesDecorridos == intervaloMeses` (6, com km abaixo) → dispara `TEMPO`.
   - Ambas as condições satisfeitas → motivo `KM` (KM é avaliado primeiro).
   - `quilometragem` nula no veículo → tratada como 0 (sem `NullPointerException`).
   - Baseline com ambas as fontes nulas (sem manutenção CONCLUIDA e sem alerta): usa
     `dataCadastro`; com `dataCadastro` nula cai no fallback de 10 anos → dispara `TEMPO`.
   - `reprocessarPendentes`: alerta cujo `veiculoId` não existe → `continue` (não notifica
     nem salva aquele), demais seguem.

## Verificação

Rodar a partir de `rotalog-api-frotas/`:

```
mvn test
```

(opcional, só a feature):
```
mvn -Dtest=ManutencaoServiceTest,AlertaManutencaoSchedulerTest,AlertaManutencaoControllerTest,ManutencaoControllerTest,ManutencaoPreventivaServiceTest test
```

Esperado: todos os testes verdes. O relatório JaCoCo é gerado na fase `test`; a regra de
`check` (mínimo 90%) incide **apenas** sobre `com.rotalog.service.VeiculoService`, então
não bloqueia os novos arquivos. Conferir que `ManutencaoService`,
`AlertaManutencaoScheduler` e os dois controllers passam a aparecer cobertos no
`target/site/jacoco/index.html`.

Pré-requisito de ambiente: JDK 11 e Maven instalados (`mvn -v`). Não é necessário
PostgreSQL nem Docker — nenhum teste sobe contexto completo nem banco.
