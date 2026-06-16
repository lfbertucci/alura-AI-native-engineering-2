# Plano — ADR 0001, Item 1: Quebrar o god service `VeiculoService`

## Context

O `VeiculoService` ([VeiculoService.java](../rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoService.java), ~340 linhas) é um **god service** que concentra CRUD, validação inline, notificação, regras de manutenção preventiva e estatísticas. A [ADR 0001](../rotalog-api-frotas/docs/adr/0001-refatoracao-veiculoservice.md) registra o problema; este plano executa **apenas o Item 1 da seção "Decisão"**: extrair colaboradores de responsabilidade única, deixando `VeiculoService` como **coordenador de CRUD**.

**Escopo:** somente Item 1. Os itens 2 (exceptions tipadas/`@RestControllerAdvice`), 3 (enum `StatusVeiculo`), 4 (injeção por construtor), 5 (SLF4J/remover `System.out`), 6 (código morto) e 7 (meta de cobertura formal) **ficam fora** — comportamento atual é preservado exceto onde o Item 1 manda mudar (estatísticas tipadas + `count` queries). Mantém-se **field injection** (`@Autowired`) por consistência com o código existente e para não invadir o Item 4.

**Resultado esperado:** mesma API/comportamento (com estatísticas agora tipadas), 4 colaboradores coesos, e suíte de testes verde — incluindo o gate JaCoCo de ≥90% de linha sobre `VeiculoService` em `mvn verify` ([pom.xml:117-139](../rotalog-api-frotas/pom.xml#L117-L139)).

## Mudanças

Pacotes: produção em `com.rotalog.service` / `com.rotalog.dto`; testes em `com.rotalog.service`.

### 1. `VeiculoValidator` (novo, `service/VeiculoValidator.java`)
`@Component`. Validações de formato puras (sem repositório), extraídas de `registrarVeiculo`/`atualizarQuilometragem`. Lança `RuntimeException` com **as mesmas mensagens atuais** (preservar, pois testes/Controller dependem delas):
- `validarPlaca(String)` — null/vazia → "Placa é obrigatória"; `length != 7` → "Placa deve ter 7 caracteres".
- `validarModelo(String)` — null/vazia → "Modelo é obrigatório".
- `validarAnoFabricacao(Integer)` — null/`<1900`/`>2100` → "Ano de fabricação inválido".
- `validarQuilometragem(Long)` — `< 0` → "Quilometragem não pode ser negativa".

### 2. `VeiculoNotificacaoService` (novo, `service/VeiculoNotificacaoService.java`)
`@Component`. Encapsula `NotificacaoClient` (injetado aqui; **removido de `VeiculoService`**). Centraliza o `try/catch` que engole exceção e loga (comportamento preservado). Métodos recebem `Veiculo`:
- `notificarNovoVeiculo(Veiculo)` → tipo `NOVO_VEICULO`.
- `notificarAlertaManutencao(Veiculo, Long km)` → tipo `ALERTA_MANUTENCAO`.
- `notificarManutencaoAgendada(Veiculo, Long kmLimite)` → tipo `MANUTENCAO_AGENDADA`.
- `notificarDesativacao(Veiculo)` → tipo `VEICULO_DESATIVADO`.

Destinatário/textos iguais aos atuais. Mantém SLF4J no `catch` (sem `System.out` — a linha `System.out` de `registrarVeiculo` desaparece naturalmente ao mover o bloco; isso é incidental, não é o Item 5).

### 3. `ManutencaoPreventivaService` (novo, `service/ManutencaoPreventivaService.java`)
`@Component`. Depende de `VeiculoRepository` + `VeiculoNotificacaoService`. Move (comportamento idêntico):
- `calcularCustoManutencao(String modelo, Long km)` — fórmula `500 + km*0.05` (param `modelo` não usado preservado; limpeza é Item 6).
- `precisaDeManutencao(Long veiculoId)` — busca via repo (`findById(...).orElseThrow(new RuntimeException("Veículo não encontrado: " + id))`), limite 50000.
- `agendarManutencaoPreventiva(Long veiculoId, Long kmLimite)` — busca, loga, chama `notificacaoService.notificarManutencaoAgendada`.

### 4. `VeiculoEstatisticasService` (novo) + DTO `EstatisticasFrotaResponse` (novo)
- DTO `dto/EstatisticasFrotaResponse.java`: campos `long total, ativos, inativos, emManutencao`. Lombok `@Getter @AllArgsConstructor` (estilo dos DTOs existentes usa Lombok). Para **preservar o contrato JSON atual** (`em_manutencao`), anotar `emManutencao` com `@JsonProperty("em_manutencao")`.
- `service/VeiculoEstatisticasService.java` (`@Component`, depende de `VeiculoRepository`): método `obterEstatisticas()` retorna o DTO. Usa **`count` queries** (corrige a ineficiência) e corrige o typo `Freita`→`Frota`.
- `VeiculoRepository`: adicionar `long countByStatus(String status);` ([VeiculoRepository.java](../rotalog-api-frotas/src/main/java/com/rotalog/repository/VeiculoRepository.java)).

### 5. `VeiculoService` (refatorar para coordenador de CRUD)
Campos `@Autowired`: `VeiculoRepository`, `VeiculoValidator`, `VeiculoNotificacaoService`, `ManutencaoPreventivaService`. **Remover** `NotificacaoClient`. Permanecem: `listarTodos`, `buscarPorId`, `buscarPorPlaca`, `registrarVeiculo`, `atualizarVeiculo`, `atualizarQuilometragem`, `obterVeiculosPorStatus`, `desativarVeiculo`, `reativarVeiculo`, `sincronizarComSistemaExterno`. **Removidos** (movidos): `calcular/precisa/agendar` manutenção e `obterEstatisticasFreita`.
- `registrarVeiculo`: `validator.validarPlaca` → checagem de duplicidade (fica no coordenador, usa repo) → `validator.validarModelo`/`validarAnoFabricacao` → `save` → `notificacaoService.notificarNovoVeiculo`.
- `atualizarQuilometragem`: `validator.validarQuilometragem` → `save` → se `manutencaoPreventivaService.precisaDeManutencao(id)` então `notificacaoService.notificarAlertaManutencao`.
- `desativarVeiculo`: `save` → `notificacaoService.notificarDesativacao`.

### 6. `VeiculoController` (estatísticas)
[VeiculoController.java:191-196](../rotalog-api-frotas/src/main/java/com/rotalog/controller/VeiculoController.java#L191-L196): injetar `VeiculoEstatisticasService`; endpoint passa a `ResponseEntity<EstatisticasFrotaResponse>` chamando `obterEstatisticas()`. Demais endpoints inalterados.

## Testes

`VeiculoServiceTest` atual ([VeiculoServiceTest.java](../rotalog-api-frotas/src/test/java/com/rotalog/service/VeiculoServiceTest.java)) quebra (muda colaboradores e métodos movidos). Reorganizar:

- **Reescrever `VeiculoServiceTest`**: `@Mock` em `VeiculoRepository`, `VeiculoValidator`, `VeiculoNotificacaoService`, `ManutencaoPreventivaService`; `@InjectMocks VeiculoService`. Cobrir todos os caminhos do coordenador (registrar incl. duplicidade; atualizar; atualizarQuilometragem com `precisa` true/false; status válido/inválido; desativar/reativar; buscar found/not-found; listar; sincronizar) verificando delegação aos mocks. **Garantir ≥90% de linha** de `VeiculoService` (gate JaCoCo).
- **Novos**: `VeiculoValidatorTest` (casos de placa/modelo/ano/km, herdados dos testes de `registrarVeiculo`), `VeiculoNotificacaoServiceTest` (cada notificação: sucesso + exceção engolida sem propagar), `ManutencaoPreventivaServiceTest` (calcular; precisa null/abaixo/igual/acima; agendar sucesso + falha de notificação), `VeiculoEstatisticasServiceTest` (contagens via `count`/`countByStatus` no DTO).

## Critical files
- Novos: `service/VeiculoValidator.java`, `service/VeiculoNotificacaoService.java`, `service/ManutencaoPreventivaService.java`, `service/VeiculoEstatisticasService.java`, `dto/EstatisticasFrotaResponse.java` (+ 4 classes de teste novas).
- Editar: `service/VeiculoService.java`, `controller/VeiculoController.java`, `repository/VeiculoRepository.java`, `test/.../VeiculoServiceTest.java`.

## Verificação
- `cd rotalog-api-frotas && mvn -q test` → toda a suíte (existente reescrita + novas) verde.
- `mvn -q verify` → além dos testes, valida o gate JaCoCo de ≥90% de linha em `VeiculoService`.
- Conferência manual: `VeiculoService` não referencia mais `NotificacaoClient` nem os métodos de manutenção/estatística; endpoint `/veiculos/estatisticas` retorna JSON com chave `em_manutencao` preservada.
