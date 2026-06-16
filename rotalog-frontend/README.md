# RotaLog Frontend

Monorepo NX com as aplicações web do RotaLog.

## Apps

- **painel-admin** — Painel administrativo de gestão (Angular)
- **rastreamento** — Portal público de rastreamento de entregas (React)

## Libs compartilhadas

- `shared-types` — Interfaces TypeScript compartilhadas entre os apps
- `ui-components` — Componentes visuais reutilizáveis (Angular)
- `api-contracts` — Definições de contratos de API (OpenAPI)

## Como rodar

```bash
npm install

# Rodar o painel admin (porta 4200)
npx nx serve painel-admin

# Rodar o rastreamento (porta 3001)
npx nx serve rastreamento

# Rodar ambos
npx nx run-many --target=serve --projects=painel-admin,rastreamento
```

## Grafo de dependências

```bash
npx nx graph
```

## Estrutura

```
rotalog-frontend/
├── apps/
│   ├── painel-admin/       # Angular 18 — standalone components
│   └── rastreamento/       # React 18
├── libs/
│   ├── shared-types/       # Interfaces TypeScript
│   ├── ui-components/      # Componentes Angular
│   └── api-contracts/      # Specs OpenAPI
├── nx.json
└── package.json
```
