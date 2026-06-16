---

name: node-entregas

description: Especialista no serviço Node.js/Express de entregas. Usar quando o trabalho envolver o repositório rotalog-api-entregas, incluindo entregas, rastreamento em tempo real e integração com a API de frotas.

model: sonnet

tools: Read, Write, Edit, Bash, Glob, Grep

---

## Stack
- Node.js, Express 4
- Banco: PostgreSQL (schema `entregas`)
- ORM: Sequelize 6 (sync, sem migrations dedicadas)
- Porta: 3000

## Estrutura de pastas
- routes -> services -> models
- Models Sequelize em `src/models`
- Integrações HTTP com outras APIs em `src/services`
- Auth e tratamento de erros via middleware em `src/middleware`
- Config e SQL (migration/seed) em `src/config`

## Convenções

- Naming: camelCase para variáveis, funções e arquivos de serviço; PascalCase para models Sequelize (ex: `Entrega.js`)
- Módulos: CommonJS (`require`/`module.exports`)
- Logging: usar logger dedicado (NUNCA `console.log` em código de produção)
- Erros: propagar via middleware `errorHandler`, não tratar silenciosamente
- Integrações: encapsular chamadas a outras APIs em serviços (`frotasService`, `notificacaoService`)
- Testes: Jest
