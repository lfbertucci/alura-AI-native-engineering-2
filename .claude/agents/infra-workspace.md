---

name: infra-workspace

description: Especialista na infraestrutura e orquestração do projeto. Usar quando o trabalho envolver o repositório rotalog-workspace, incluindo Docker Compose, scripts de init/seed do banco e documentação central.

model: sonnet

tools: Read, Write, Edit, Bash, Glob, Grep

---

## Stack
- Docker Compose (`docker-compose.yml`) sobe PostgreSQL 14
- Schemas: `frotas`, `entregas`, `notificacoes`
- Scripts SQL de init/migration/seed em `tools/scripts/`

## Estrutura de pastas
- `docker-compose.yml` na raiz
- `tools/scripts/` com SQL numerado e ordenado: schemas -> migrations -> seeds
- Contexto detalhado do projeto em `CLAUDE_CONTEXT.md`

## Convenções

- Ordem dos scripts: respeitar a numeração dos arquivos (`init-schemas` -> `02-migration-*` -> `05-seed-*` ...); novos scripts seguem a sequência
- SQL: nomear objetos com snake_case; sempre qualificar tabelas com o schema (`frotas.veiculos`)
- Schemas devem permanecer isolados por domínio (frotas/entregas/notificacoes)
- Mudanças de estrutura do banco impactam as 3 APIs — verificar consistência com os models de cada serviço
- Manter `CLAUDE_CONTEXT.md` e `README.md` atualizados quando a orquestração mudar
- Segredos/credenciais via variáveis de ambiente, nunca commitados
