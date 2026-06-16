# Rotalog — Sistema de Gestão de Frotas e Entregas

> **Projeto educacional** desenvolvido durante o curso **AI-Native Engineering** da [Alura](https://www.alura.com.br/).
> Este repositório não representa minha stack principal de trabalho — foi criado exclusivamente para fins de aprendizado das práticas de engenharia com IA.

---

## Sobre o Projeto

O **Rotalog** é um sistema de gerenciamento de frotas e entregas construído como uma arquitetura de microsserviços poliglota. O objetivo é simular um ambiente realista de produção — incluindo dívidas técnicas intencionais — para praticar análise, refatoração e evolução de sistemas com o auxílio de ferramentas de IA.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     rotalog-frontend                    │
│          Angular 18 (painel-admin)                      │
│          React 18 (portal de rastreamento)              │
│                   Monorepo Nx 19                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│  api-frotas  │ │ api-entregas │ │  api-notificacoes    │
│ Java/Spring  │ │  Node.js/    │ │  .NET Core 6         │
│  Boot 2.7   │ │  Express 4   │ │  ASP.NET Core        │
│  porta 8080  │ │  porta 3000  │ │  porta 5000          │
└──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘
       │                │                     │
       └────────────────┴─────────────────────┘
                        │
              ┌─────────▼──────────┐
              │    PostgreSQL 14   │
              │  schemas: frotas   │
              │         entregas   │
              │         notificacoes│
              └────────────────────┘
```

---

## Serviços

### `rotalog-api-frotas` — Java / Spring Boot 2.7
Responsável por veículos, motoristas, manutenção e roteamentos.

- **Banco:** PostgreSQL (schema `frotas`)
- **Migrations:** Flyway (presente, mas desabilitado — intencional para fins didáticos)
- **Estrutura:** `controller → service → repository`
- **Porta:** `8080`

### `rotalog-api-entregas` — Node.js / Express 4
Responsável por entregas, rastreamento em tempo real e integração com a API de frotas.

- **Banco:** PostgreSQL (schema `entregas`) via Sequelize
- **Estrutura:** `routes → services → models`
- **Auth:** Middleware em `src/middleware`
- **Porta:** `3000`

### `rotalog-api-notificacoes` — .NET Core 6 / ASP.NET Core
Responsável pelo envio de notificações (e-mail/SMS), templates e configurações.

- **Banco:** PostgreSQL (schema `notificacoes`) via Entity Framework Core + Npgsql
- **Estrutura:** `Controllers → Services → Data (DbContext)`
- **Porta:** `5000` (Swagger habilitado)

### `rotalog-frontend` — Nx 19 / Angular 18 + React 18
Duas aplicações web no mesmo monorepo:

| App | Framework | Descrição |
|-----|-----------|-----------|
| `painel-admin` | Angular 18 | Painel de gestão interna |
| `rastreamento` | React 18 | Portal público de rastreamento |

Libs compartilhadas: `shared-types`, `ui-components`, `api-contracts`.

### `rotalog-workspace` — Infraestrutura
Docker Compose que orquestra o PostgreSQL e scripts de inicialização/seed em `tools/scripts/`.

---

## Como Executar

### Pré-requisitos
- Docker e Docker Compose
- Java 11+
- Node.js 18+
- .NET 6 SDK

### 1. Subir o banco de dados

```bash
cd rotalog-workspace
docker-compose up -d
```

### 2. API de Frotas (Java)

```bash
cd rotalog-api-frotas
./mvnw spring-boot:run
```

### 3. API de Entregas (Node.js)

```bash
cd rotalog-api-entregas
npm install
npm start
```

### 4. API de Notificações (.NET)

```bash
cd rotalog-api-notificacoes
dotnet run
```

### 5. Frontend (Nx)

```bash
cd rotalog-frontend
npm install
npx nx serve painel-admin     # Angular — http://localhost:4200
npx nx serve rastreamento     # React   — http://localhost:4201
```

---

## Contexto Educacional

Este projeto foi estruturado com **dívidas técnicas intencionais** para simular situações reais encontradas em sistemas legados e em crescimento. Entre os tópicos explorados no curso:

- Análise de código com IA para identificar dívidas técnicas
- Refatoração assistida por IA em múltiplas linguagens/frameworks
- Comunicação entre microsserviços (HTTP síncrono)
- Estratégias de migração de banco de dados
- Definition of Done (DoD) e critérios de aceite
- Testes unitários e E2E em ambientes poliglotas

> Para um mapeamento detalhado das dívidas técnicas identificadas, veja [`MAPA-DIVIDAS-TECNICAS.md`](./MAPA-DIVIDAS-TECNICAS.md).

---

## Stack deste Projeto

| Camada | Tecnologia |
|--------|-----------|
| Backend 1 | Java 11 + Spring Boot 2.7 + JPA/Hibernate + Flyway |
| Backend 2 | Node.js 18 + Express 4 + Sequelize + PostgreSQL |
| Backend 3 | .NET 6 + ASP.NET Core + EF Core + Npgsql |
| Frontend | Angular 18 + React 18 + Nx 19 |
| Banco | PostgreSQL 14 |
| Infra | Docker Compose |

> Esta **não** é minha stack principal de trabalho. O uso de múltiplas tecnologias é proposital para exercitar a prática de engenharia com IA em diferentes ecossistemas.

---

## Curso

**Alura — AI-Native Engineering**
Aprendendo a utilizar ferramentas de IA para análise, evolução e desenvolvimento de software em ambientes reais e complexos.

---

*Repositório de uso educacional. Não utilizar em produção.*
