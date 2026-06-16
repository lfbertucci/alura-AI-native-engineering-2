# RotaLog API Notificações

Microsserviço de notificações — envio de emails e SMS transacionais.

## Stack

- .NET Core 6
- Entity Framework Core
- MediatR
- PostgreSQL (schema `notificacoes`)

## Como rodar

Pré-requisito: PostgreSQL rodando via `rotalog-workspace`.

```bash
dotnet restore
dotnet run
```

A API sobe na porta **5000**.

## Estrutura do projeto

O projeto segue uma estrutura inspirada em Clean Architecture:

```
├── Domain/            # Entidades e interfaces
├── Application/       # Handlers e lógica de aplicação
├── Infrastructure/    # Acesso a dados, serviços externos
├── Controllers/       # Endpoints REST
└── Program.cs
```

## Endpoints principais

| Método | Rota                        | Descrição                      |
|--------|-----------------------------|--------------------------------|
| POST   | /api/notificacoes/email     | Enviar notificação por email   |
| POST   | /api/notificacoes/sms       | Enviar notificação por SMS     |
| GET    | /api/notificacoes/historico | Histórico de envios            |
| GET    | /health                     | Health check do serviço        |
