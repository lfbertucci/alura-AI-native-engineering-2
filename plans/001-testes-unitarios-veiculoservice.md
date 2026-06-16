# Plano 001: Testes unitários para VeiculoService (≥90% cobertura)

## Contexto

A classe [VeiculoService.java](../rotalog-api-frotas/src/main/java/com/rotalog/service/VeiculoService.java)
concentra lógica de negócio, validação e notificação (dívida técnica intencional do curso) e
**não possui nenhum teste** — o diretório `src/test` não existe. O objetivo é criar uma suíte de
testes unitários JUnit 5 + Mockito que exercite todos os métodos e ramos da classe, atingindo
**pelo menos 90% de cobertura**, com todos os testes passando.

O `pom.xml` herda do `spring-boot-starter-parent 2.7.14` e já traz `spring-boot-starter-test`
(JUnit 5, Mockito, AssertJ). Java 11 e Maven 3.9.16 estão disponíveis. **Não há plugin de
cobertura** configurado, então a verificação dos 90% exige adicionar o JaCoCo.

## Dependências da classe (a serem mockadas)

- [VeiculoRepository.java](../rotalog-api-frotas/src/main/java/com/rotalog/repository/VeiculoRepository.java) — `findAll`, `findById`, `findByPlaca`, `findByStatus`, `save`, `count`
- [NotificacaoClient.java](../rotalog-api-frotas/src/main/java/com/rotalog/service/NotificacaoClient.java) — `enviarNotificacao` (pode lançar exceção)
- [Veiculo.java](../rotalog-api-frotas/src/main/java/com/rotalog/domain/Veiculo.java) — entidade com getters/setters Lombok

## Mudanças

### 1. Adicionar JaCoCo ao `pom.xml`
Arquivo: [pom.xml](../rotalog-api-frotas/pom.xml)

Adicionar o `jacoco-maven-plugin` (versão `0.8.11`, compatível com Java 11) na seção `<build><plugins>`,
com execuções `prepare-agent` e `report`, e uma `check` opcional com regra de linha ≥ 0.90 limitada
à classe `VeiculoService`. Isso gera o relatório em `target/site/jacoco/index.html` e permite validar a meta.

### 2. Criar a classe de teste
Arquivo novo: `rotalog-api-frotas/src/test/java/com/rotalog/service/VeiculoServiceTest.java`

- `@ExtendWith(MockitoExtension.class)`, `@Mock VeiculoRepository`, `@Mock NotificacaoClient`,
  `@InjectMocks VeiculoService` (injeção em campo via reflexão — compatível com os `@Autowired` de campo).
- Helper `criarVeiculo(...)` para montar entidades de teste.
- Usar `assertThrows` para os `RuntimeException` e `verify(...)` para interações com o cliente de notificação.

#### Casos de teste por método (cobrindo todos os ramos)
- **listarTodos**: retorna lista do repositório.
- **buscarPorId**: encontrado; não encontrado → `RuntimeException`.
- **buscarPorPlaca**: encontrado; não encontrado → `RuntimeException`.
- **registrarVeiculo**: placa null; placa vazia; placa ≠ 7 chars; placa duplicada;
  modelo null; modelo vazio; ano null; ano < 1900; ano > 2100; sucesso (verifica `toUpperCase`,
  status `ATIVO`, quilometragem 0, datas e notificação enviada); notificação lança exceção
  (veículo ainda é salvo/retornado — ramo `catch` + `System.out`).
- **atualizarVeiculo**: atualiza modelo/ano/quilometragem; modelo null/vazio ignorado; ano null ignorado;
  quilometragem null ignorada; quilometragem menor que a atual (ramo de `log.warn`, ainda aplica).
- **atualizarQuilometragem**: negativa → exceção; menor que a atual (ramo `System.out`);
  `precisaDeManutencao` true com notificação OK; `precisaDeManutencao` true com notificação lançando exceção;
  `precisaDeManutencao` false (sem notificação). *(Atenção: o método chama `buscarPorId` e depois
  `precisaDeManutencao`, que chama `buscarPorId` de novo → `findById` é invocado 2x.)*
- **obterVeiculosPorStatus**: status válido; status inválido → exceção.
- **agendarManutencaoPreventiva**: sucesso (notificação enviada); notificação lança exceção (ramo `catch`).
- **calcularCustoManutencao**: valida fórmula `500 + km*0.05`.
- **precisaDeManutencao**: quilometragem null → false; abaixo do limite → false; igual/acima de 50000 → true.
- **desativarVeiculo**: sucesso (status `INATIVO` + notificação); notificação lança exceção (ramo `catch`).
- **reativarVeiculo**: status volta a `ATIVO`.
- **obterEstatisticasFreita**: monta JSON com contagens de `count` e `findByStatus`.
- **sincronizarComSistemaExterno**: executa sem erro (cobertura do corpo do método).

## Verificação

```bash
cd "e:/Projetos ALURA - Carreira IA Native/rotalog/rotalog-api-frotas"
mvn -q test
```

- Confirmar `BUILD SUCCESS` e todos os testes verdes.
- Abrir/inspecionar `target/site/jacoco/jacoco.csv` (ou `index.html`) e confirmar
  cobertura de `VeiculoService` ≥ 90% (linha e ramos). Ajustar/adicionar casos se necessário.
