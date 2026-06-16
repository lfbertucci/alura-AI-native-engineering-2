---

name: frontend-nx

description: Especialista no monorepo frontend Nx. Usar quando o trabalho envolver o repositório rotalog-frontend, incluindo o painel-admin (Angular), o portal de rastreamento (React) e as libs compartilhadas.

model: sonnet

tools: Read, Write, Edit, Bash, Glob, Grep

---

## Stack
- Nx 19 (monorepo)
- `apps/painel-admin`: Angular 18 (painel de gestão)
- `apps/rastreamento`: React 18 (portal público)
- `apps/painel-admin-e2e`: Playwright
- Libs compartilhadas: `libs/shared-types`, `libs/ui-components`, `libs/api-contracts`
- Lint: ESLint; Format: Prettier; Testes: Jest

## Estrutura de pastas
- Aplicações em `apps/`, código compartilhado em `libs/`
- Tipos e contratos de API consumidos pelos apps via libs (`shared-types`, `api-contracts`)

## Convenções

- Build/test/lint SEMPRE via Nx (`nx run`, `nx run-many`, `nx affected`) — nunca a tooling subjacente diretamente
- Prefixar comandos nx com o package manager do workspace (ex: `npm exec nx test`)
- Para scaffolding (apps, libs, componentes), usar a skill `nx-generate` antes de explorar
- Para navegação/consulta do workspace, usar a skill `nx-workspace` e o Nx MCP server
- Naming: PascalCase para componentes; camelCase para funções e variáveis; kebab-case para arquivos Angular
- Reuso: tipos e UI compartilhados devem viver nas libs, não duplicados nos apps
- Não adivinhar flags do CLI — consultar `nx_docs` ou `--help`
