# Rotalog

## Visão Geral

Sistema de gestão de frotas e entregas. Gerência veículos, motoristas, entregas e notificação.
Composto por 3 APIs de backend e 2 frontends (monorepo nx).

## Repositórios

### rotalog-api-frotas (Java/Spring Boot 2.7)

- Responsabilidade: pedidos, roteamentos, tracking
- Banco: PostgreSQL
- Migrations: Flyway
- Estrutura: controller -> service -> repository
- Entidades JPA em model

### rotalog-api-entregas (Node.js/Express 4)

- Responsabilidade: entregas, rastreamento em tempo real, integração com frotas
- Banco: PostgreSQL (schema `entregas`)
- ORM: Sequelize (sync, sem migrations dedicadas)
- Estrutura: routes -> services -> models
- Models Sequelize em `src/models`; integrações HTTP com outras APIs em `src/services`
- Auth via middleware em `src/middleware`; porta 3000

### rotalog-api-notificacoes (.NET Core 6)

- Responsabilidade: envio de notificações (email/SMS), templates e configurações
- Banco: PostgreSQL (schema `notificacoes`) via Npgsql
- ORM: Entity Framework Core (EnsureCreated, sem migrations)
- Estrutura: Controllers -> Services -> Data (DbContext)
- Entidades EF em `Models`; DTOs em `DTOs`; MediatR registrado mas não utilizado
- Porta 5000; Swagger habilitado

### rotalog-frontend (Monorepo Nx 19)

- Responsabilidade: aplicações web de gestão e rastreamento
- Apps: `apps/painel-admin` (Angular 18, painel de gestão), `apps/rastreamento` (React 18, portal público)
- Libs compartilhadas: `libs/shared-types`, `libs/ui-components`, `libs/api-contracts`
- Build/test/lint via Nx (`nx run`, `nx run-many`, `nx affected`); ver CLAUDE.md do próprio repo
- E2E em `apps/painel-admin-e2e` (Playwright)

### rotalog-workspace (Infraestrutura)

- Responsabilidade: orquestração e documentação central
- Docker Compose (`docker-compose.yml`) sobe PostgreSQL 14 com schemas `frotas`, `entregas`, `notificacoes`
- Scripts de init/seed em `tools/scripts/` (schemas -> migrations -> seeds, na ordem)
- Contexto detalhado do projeto em `CLAUDE_CONTEXT.md`