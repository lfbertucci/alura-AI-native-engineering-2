# ADR 0001 — Refatoração do VeiculoService

- **Status:** Proposto
- **Data:** 2026-06-13
- **Contexto técnico:** rotalog-api-frotas (Java 11 / Spring Boot 2.7)
- **Componente afetado:** `com.rotalog.service.VeiculoService`
- **Referências:** [MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) (seção "🚚 rotalog-api-frotas"), [VeiculoService.java](../../src/main/java/com/rotalog/service/VeiculoService.java)

---

## Contexto

O `VeiculoService` é um **god service** com ~340 linhas que concentra responsabilidades
que deveriam estar separadas: CRUD de veículos, validação de entrada, regras de
manutenção/custo, cálculo de estatísticas e disparo de notificações. O
[MAPA-DIVIDAS-TECNICAS.md](../../../MAPA-DIVIDAS-TECNICAS.md) já classifica a classe como
🟠 *God service* e aponta vários dos problemas abaixo.

Esta ADR consolida os problemas **atuais e potenciais** e registra as decisões de
correção. Ela é **apenas documental** — nenhuma refatoração de código foi executada
neste momento.

### Problemas identificados

#### Arquitetura / Responsabilidades (SRP)
- **Múltiplas responsabilidades numa única classe**: CRUD (`listarTodos`, `buscarPorId`,
  `buscarPorPlaca`, `registrarVeiculo`, `atualizarVeiculo`, `desativar`/`reativar`) +
  validação inline + manutenção/custo (`calcularCustoManutencao`, `precisaDeManutencao`,
  `agendarManutencaoPreventiva`) + estatísticas (`obterEstatisticasFreita`) + notificação.
  Dificulta teste, evolução e reaproveitamento.
- **Acoplamento direto ao `NotificacaoClient`** dentro do service (anotado como `FIXME` na
  linha 31), com chamadas HTTP espalhadas por vários métodos.
- **Exceções de notificação engolidas**: falha ao notificar apenas loga; em
  `registrarVeiculo` o veículo já foi salvo mas o erro de notificação é silenciado.

#### Tratamento de erros
- **`RuntimeException` genérica para todos os erros de negócio** (não encontrado,
  validação inválida, duplicidade). Isso torna **impossível mapear o status HTTP correto**
  (404 / 400 / 409) sem inspecionar a mensagem. Ocorrências: linhas 49, 57, 70, 74, 80,
  85, 90, 160, 196.
- **Sem `@ControllerAdvice`**: o `VeiculoController` repete `try/catch (RuntimeException)`
  por endpoint, com mapeamento de status frágil e duplicado.

#### Modelagem / Type-safety
- **Status como String hardcoded** (`"ATIVO"`, `"INATIVO"`, `"MANUTENCAO"`) tanto no
  service quanto na entidade `Veiculo` (campo `status` é `String`, anotado como
  `FIXME: deveria ser enum`). Comparações por string são frágeis e propensas a erro de
  digitação/caixa. Validação de status feita com `if (!status.equals("ATIVO") && ...)`
  (linha 195).
- **`obterEstatisticasFreita` retorna JSON montado como `String`** (linhas 304–316) em vez
  de um objeto tipado / DTO. Inclui **typo permanente no nome do método** (`Freita` em vez
  de `Frota`), exposto à API via controller.
- **Contagem ineficiente**: `findByStatus(...).size()` (linhas 307–309) carrega todas as
  entidades só para contar, em vez de uma `count` query.

#### Logging
- **`System.out.println` misturado com SLF4J** nas linhas 116, 164 e 327 — viola a
  convenção do projeto (logging sempre via SLF4J; nunca `System.out.println`).
- Mensagens de log misturando português e inglês.

#### Código morto / variáveis não utilizadas
- **Variáveis declaradas e nunca usadas** em `agendarManutencaoPreventiva`:
  `intervaloQuilometragem` e `intervaloMeses` (linhas 212–213).
- **Parâmetro não utilizado** `modelo` em `calcularCustoManutencao` (linha 236).
- **Método stub no-op** `sincronizarComSistemaExterno` (linhas 324–332): apenas loga e tem
  TODOs, sem implementação e sem chamador.

#### Documentação
- **Javadoc em excesso** e poluído com `FIXME`/`TODO` em quase todos os métodos,
  descrevendo dívidas em vez de documentar comportamento — gera ruído.

#### Qualidade / Testes
- **Ausência total de testes** para a classe, apesar do `spring-boot-starter-test` no
  classpath (confirmado no MAPA).
- **Field injection** (`@Autowired` em campo, linhas 27 e 30–31) em vez de injeção por
  construtor, dificultando testes unitários e tornando dependências implícitas.

---

## Decisão

As correções recomendadas (a serem implementadas em trabalho posterior) são:

1. **Quebrar o god service em colaboradores com responsabilidade única**, mantendo
   `VeiculoService` como coordenador de CRUD:
   - `VeiculoValidator` — validações de placa, modelo, ano e quilometragem.
   - `VeiculoNotificacaoService` — encapsula as chamadas ao `NotificacaoClient`.
   - `ManutencaoPreventivaService` — `calcularCustoManutencao`, `precisaDeManutencao`,
     `agendarManutencaoPreventiva`.
   - `VeiculoEstatisticasService` + DTO `EstatisticasFrotaResponse` (substitui o JSON em
     `String` e corrige o typo `Freita` → `Frota`, usando `count` queries).

2. **Criar exceptions específicas** (ex.: `VeiculoNaoEncontradoException` → 404,
   `VeiculoDuplicadoException` → 409, `DadosVeiculoInvalidosException` /
   `StatusVeiculoInvalidoException` → 400) e um **`@RestControllerAdvice` global** que mapeia
   cada uma para o status HTTP correto, removendo os `try/catch` por endpoint.

3. **Introduzir o enum `StatusVeiculo`** (`ATIVO`, `INATIVO`, `MANUTENCAO`) na entidade
   `Veiculo` (`@Enumerated(EnumType.STRING)`), eliminando strings de status hardcoded.

4. **Adotar injeção por construtor** em vez de field injection.

5. **Padronizar logging em SLF4J**, removendo todos os `System.out.println`.

6. **Remover código morto e variáveis/parâmetros não utilizados** e **enxugar o
   javadoc/FIXME** excessivo.

7. **Adicionar testes unitários (JUnit 5 + Mockito) com cobertura ≥ 90%**, medida via
   JaCoCo.

---

## Consequências

### Positivas
- Aderência ao **Single Responsibility Principle**; classes menores e coesas.
- **Testabilidade** muito maior (dependências explícitas via construtor, colaboradores
  mockáveis).
- **Mapeamento HTTP correto** (404 / 400 / 409) a partir de exceptions tipadas.
- **Type-safety de status** com enum; fim das comparações por string.
- Logs consistentes (SLF4J) e código mais limpo (sem morto/ruído).

### Negativas / Riscos
- **Blast radius da mudança de status para enum**: além da entidade `Veiculo`, exige
  ajustes no `VeiculoRepository` (`findByStatus`/contagem) e no `ManutencaoService`, que
  hoje fazem `setStatus("MANUTENCAO"/"ATIVO")`.
- A **JPQL com literal de status** (`findVeiculosAtivosComQuilometragemAlta`, que usa
  `v.status = 'ATIVO'`) precisará ser ajustada para o enum.
- Aumento no número de classes/arquivos do módulo.

> **Nota:** boa parte desta dívida é *intencional* (codebase didática da Alura). Esta ADR
> serve como registro consolidado dos problemas e do caminho de correção recomendado.
