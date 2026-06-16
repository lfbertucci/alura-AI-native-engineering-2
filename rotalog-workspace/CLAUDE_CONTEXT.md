# Contexto do Projeto RotaLog para Claude Code

Este documento contém o histórico completo de criação e evolução do projeto **RotaLog**, um sistema legado com dívida técnica intencional criado para o curso da Alura "Desenvolvendo com IA: complexidade, legado e escala".

## 🎯 Objetivo do Projeto

O RotaLog é um sistema de gestão de frotas e entregas projetado especificamente para ser **ruim**. Ele contém débitos técnicos intencionais, arquiteturas abandonadas, antipatterns e bugs sutis. O objetivo é que os alunos usem ferramentas de IA (como Claude Code, Cursor, GitHub Copilot) para entender, diagnosticar e refatorar este código.

## 🏗️ Arquitetura e Repositórios

O sistema é composto por 4 repositórios principais, todos hospedados na organização/usuário `Charlinho` no GitHub:

### 1. rotalog-workspace (Infraestrutura)
- **Repositório:** `https://github.com/Charlinho/rotalog-workspace`
- **Propósito:** Orquestração via Docker Compose e documentação central.
- **Componentes:**
  - PostgreSQL 14 com 3 schemas (`frotas`, `entregas`, `notificacoes`).
  - Scripts de inicialização automática (`tools/scripts/`) que criam as tabelas e inserem dados (seed) na primeira execução.
- **Dívida Técnica:** Senhas hardcoded no compose, falta de health checks, serviços comentados (Redis, Kafka) que nunca foram implementados.

### 2. rotalog-frontend (Monorepo NX)
- **Repositório:** `https://github.com/Charlinho/rotalog-frontend`
- **Propósito:** Aplicações web para os usuários finais e gestores.
- **Componentes:**
  - `apps/painel-admin`: Angular 14 (atualizado para 18 via NX) - Painel de gestão.
  - `apps/rastreamento`: React 17 - Portal de rastreamento público.
  - `libs/`: Bibliotecas compartilhadas (`shared-types`, `ui-components`, `api-contracts`).
- **Dívida Técnica:**
  - **Angular:** Componentes "God Object" (lista, form e detalhes no mesmo arquivo com 500+ linhas), CSS global vazando, `fetch()` direto em vez de `HttpClient`, sem lazy loading.
  - **React:** 70% class components, tipagem `any` para burlar o strict mode, Redux sem Toolkit, botões de zoom falsos (corrigidos parcialmente).

### 3. rotalog-api-frotas (Java/Spring Boot)
- **Repositório:** `https://github.com/Charlinho/rotalog-api-frotas`
- **Propósito:** Gestão de veículos, motoristas e manutenções.
- **Stack:** Java 11, Spring Boot 2.7, Spring Data JPA, Flyway.
- **Dívida Técnica:** Herança JPA usando `TABLE_PER_CLASS` (péssima performance), `VeiculoService` com 400+ linhas misturando responsabilidades, sem testes unitários, chamadas HTTP síncronas bloqueantes para outros serviços.

### 4. rotalog-api-entregas (Node.js/Express)
- **Repositório:** `https://github.com/Charlinho/rotalog-api-entregas`
- **Propósito:** Gestão de pedidos, rotas e rastreamento em tempo real.
- **Stack:** Node.js 18, Express 4.x, Sequelize ORM.
- **Dívida Técnica:** 60% do código usa callbacks em vez de async/await, middleware de autenticação copiado do StackOverflow (inseguro), credenciais hardcoded no `.env`, queries SQL raw misturadas com ORM.

### 5. rotalog-api-notificacoes (.NET Core)
- **Repositório:** `https://github.com/Charlinho/rotalog-api-notificacoes`
- **Propósito:** Envio de emails e SMS transacionais.
- **Stack:** .NET Core 6, Entity Framework Core, MediatR.
- **Dívida Técnica:** Clean Architecture iniciada e abandonada no meio, handlers do MediatR gigantes (God classes), acesso direto ao banco de dados dos outros serviços via SQL (violação de bounded context no `HealthController`).

## 🔄 Histórico de Evolução (O que foi feito)

O projeto foi construído iterativamente com os seguintes marcos principais:

1. **Criação Base:** Geração dos esqueletos dos 5 projetos com base nas especificações da skill `rotalog-project-creator`.
2. **Separação e Versionamento:** Divisão em 5 repositórios Git independentes com histórico fictício de commits (simulando diferentes desenvolvedores como "João Silva", "Maria Santos", etc).
3. **Publicação no GitHub:** Push de todos os repositórios para a conta `Charlinho` com o prefixo `rotalog-`.
4. **Evolução do Frontend:**
   - Implementação real do `painel-admin` (Angular) com telas de Dashboard, Veículos, Motoristas, Manutenções e Entregas.
   - Implementação do `rastreamento` (React) com mapa fake e lista de eventos.
   - Resolução de problemas de build do NX (dependências do React, tsconfig strict mode relaxado intencionalmente).
5. **Evolução das APIs:**
   - **Frotas:** Adição de Lombok, repositórios JPA, controllers REST completos e integração HTTP com as outras APIs.
   - **Entregas:** Migração de mock para Sequelize, criação de 21 endpoints funcionais, adição de arquivo `requests.http` para testes.
   - **Notificações:** Implementação de DbContext, MediatR handlers, e violação intencional de arquitetura no HealthCheck.
6. **Automação de Dados (Seed):**
   - Criação de scripts SQL consolidados no `rotalog-workspace/tools/scripts/`.
   - Configuração do `docker-compose.yml` para executar os scripts automaticamente na ordem correta (schemas -> migrations -> seeds).
   - População com dados realistas de São Paulo (20 entregas, 42 rastreamentos, 10 veículos, etc).
   - `09-add-alertas-manutencao.sql`: cria a tabela `frotas.alertas_manutencao` (idempotente via `IF NOT EXISTS`).
   - `10-seed-alertas-elegiveis.sql`: insere 4 veículos e manutenções de baseline para testes de elegibilidade de alerta preventivo (idempotente via `ON CONFLICT` e `WHERE NOT EXISTS`).

## 🚀 Como Executar o Ambiente Completo

1. **Subir Banco de Dados:**
   ```bash
   cd rotalog-workspace
   docker-compose up -d postgres
   ```
   *(Isso criará os schemas e populará todas as tabelas automaticamente)*

2. **API Frotas (Porta 8080):**
   ```bash
   cd rotalog-api-frotas
   ./mvnw spring-boot:run
   ```

3. **API Entregas (Porta 3000):**
   ```bash
   cd rotalog-api-entregas
   npm install
   npm start
   ```

4. **API Notificações (Porta 5000):**
   ```bash
   cd rotalog-api-notificacoes
   dotnet restore
   dotnet run
   ```

5. **Frontend (Portas 4200 e 3001):**
   ```bash
   cd rotalog-frontend
   npm install
   npx nx run-many --target=serve --projects=painel-admin,rastreamento
   ```

## ⚠️ Instruções para o Claude Code

Ao atuar neste projeto, o Claude Code deve ter em mente:
1. **NÃO corrija a dívida técnica proativamente.** Os problemas arquiteturais, bugs de performance e código ruim são o material didático do curso.
2. **Siga o estilo legado** ao adicionar novas features, a menos que o usuário explicitamente peça uma refatoração.
3. **Cuidado com as integrações:** Os serviços se comunicam via HTTP e, em alguns casos (como o api-notificacoes), acessam o banco de dados uns dos outros diretamente.
4. O banco de dados é populado automaticamente via scripts no `rotalog-workspace`. Se precisar de novos dados de teste, atualize os scripts lá.
