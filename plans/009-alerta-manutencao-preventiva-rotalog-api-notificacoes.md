# Plano 009: Alerta de Manutenção Preventiva — rotalog-api-notificacoes

> Parte 2 de 3 do recurso "Alerta de manutenção preventiva" (ver `DoD.md`).
> Planos relacionados: `008-...-rotalog-api-frotas`, `010-...-painel-admin`.

## Contexto

A api-frotas (plano 008) faz uma chamada **HTTP síncrona** para esta API quando encontra um veículo
elegível a manutenção preventiva. Pelo `DoD.md`, esta API precisa: **receber o pedido de alerta**,
**enviar e-mail para o gestor** e **retornar o status da notificação** (enviada/falha).

A boa notícia: o endpoint principal já atende a esses três critérios. O
[POST /api/notificacoes](../rotalog-api-notificacoes/Controllers/NotificacoesController.cs) cria a
notificação, dispara o envio (via [NotificacaoService](../rotalog-api-notificacoes/Services/NotificacaoService.cs)) e retorna `NotificacaoResponse` com `Status` (`ENVIADO`/`FALHA`/`PENDENTE`) e `Id`. O seed já contém o
tipo/template `ALERTA_MANUTENCAO`. Portanto, **não há mudança funcional de código** — o escopo deste
plano é **garantir o contrato** e **adicionar o teste unitário** exigido pelo DoD.

### Contrato esperado pela api-frotas (payload enviado)
```json
POST /api/notificacoes
{
  "tipo": "ALERTA_MANUTENCAO",
  "canal": "email",
  "destinatario": "gestor@rotalog.com",
  "mensagem": "Veículo ABC1D23 precisa de manutenção preventiva (TEMPO)...",
  "servicoOrigem": "api-frotas"
}
```
Resposta (201) deve conter `id` e `status` (`ENVIADO`/`FALHA`/`PENDENTE`).

## Mudanças

### 1. Verificação do contrato (sem alteração de código esperada)
Confirmar em [NotificacaoService.CriarNotificacao](../rotalog-api-notificacoes/Services/NotificacaoService.cs):
- aceita `tipo=ALERTA_MANUTENCAO` com `canal=email` e usa o template do seed (se houver template email
  para esse tipo; caso o seed só tenha canal `sms`, **adicionar um template email** `ALERTA_MANUTENCAO`
  em `../rotalog-api-notificacoes/Data/seed.sql` para o e-mail ao gestor sair formatado);
- o `Status` retornado reflete `ENVIADO`/`FALHA`; envio fake atual é aceitável.
- Garantir que o e-mail vai ao **gestor** (o `destinatario` vem no request da frotas = `gestor@rotalog.com`).

Nenhuma outra alteração de endpoint é necessária (reuso do `POST /api/notificacoes`).

## Testes (xUnit — padrão do projeto .NET)

Arquivo novo de teste para `NotificacaoService` (projeto de testes `*.Tests` com EF Core InMemory ou SQLite):
- **CriarNotificacao de `ALERTA_MANUTENCAO` retorna status preenchido** — cria a notificação e o
  `Status` resultante é `ENVIADO` ou `FALHA` (nunca vazio); `Id` é gerado.
- **Aplica template quando há `Variaveis`** (se o fluxo da frotas passar variáveis) — corpo renderizado.
- **Persiste com `servico_origem`/`tipo` corretos** — consultável depois por `ListarNotificacoes(tipo:"ALERTA_MANUTENCAO")`.
- **Envio com falha marca `FALHA`** após exceder `max_tentativas` (forçar o ramo de falha).

Caso o projeto ainda não tenha um `.csproj` de testes, criar `rotalog-api-notificacoes.Tests`
com `xunit`, `Microsoft.NET.Test.Sdk` e `Microsoft.EntityFrameworkCore.InMemory`, referenciando o projeto principal.

## Verificação

1. `dotnet test` na solução da api-notificacoes → testes verdes.
2. Subir a API (porta 5000, Swagger em `/swagger`).
3. `POST /api/notificacoes` com o payload do contrato acima → resposta 201 com `status` preenchido.
4. `GET /api/notificacoes?tipo=ALERTA_MANUTENCAO` lista a notificação criada (validação ponta-a-ponta com o plano 008).
