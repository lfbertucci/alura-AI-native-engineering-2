# RotaLog Workspace

Configuração de infraestrutura do RotaLog — sistema de gestão de frotas e entregas.

## Serviços

| Serviço            | Stack                | Porta | Repositório                  |
|--------------------|----------------------|-------|------------------------------|
| API Frotas         | Java / Spring Boot   | 8080  | rotalog-api-frotas           |
| API Entregas       | Node.js / Express    | 3000  | rotalog-api-entregas         |
| API Notificações   | .NET Core 6          | 5000  | rotalog-api-notificacoes     |
| Painel Admin       | Angular (NX)         | 4200  | rotalog-frontend             |
| Rastreamento       | React (NX)           | 3001  | rotalog-frontend             |

## Banco de Dados

PostgreSQL 14 com três schemas:

- `frotas` — veículos, motoristas, manutenções, alertas de manutenção preventiva
- `entregas` — pedidos, rotas, rastreamento
- `notificacoes` — templates, histórico de envio

Os scripts em `tools/scripts/` criam os schemas e populam as tabelas automaticamente
na primeira execução do container.

## Como subir

```bash
docker-compose up -d
```

Isso sobe o PostgreSQL e executa os scripts de inicialização. As APIs e frontends
precisam ser iniciados separadamente em seus respectivos repositórios.

## Estrutura

```
rotalog-workspace/
├── docker-compose.yml
├── tools/
│   └── scripts/       # SQL de inicialização (schemas, migrations, seeds)
└── README.md
```

## Observações

- Se precisar resetar o banco, apague o volume do Docker antes de subir novamente:
  `docker-compose down -v && docker-compose up -d`
- Redis e Kafka estão comentados no compose — nunca foram implementados.
