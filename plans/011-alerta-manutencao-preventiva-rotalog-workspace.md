# Plano 011: Alerta de Manutenção Preventiva — rotalog-workspace (scripts de banco)

> Parte 4 de 4 do recurso "Alerta de manutenção preventiva" (ver `DoD.md`).
> Planos relacionados: `008-...-rotalog-api-frotas`, `009-...-rotalog-api-notificacoes`, `010-...-painel-admin`.
> Este plano é o **dono autoritativo** dos scripts SQL referenciados pelo plano 008.

## Contexto

O banco do Rotalog é provisionado pelo [docker-compose.yml](../rotalog-workspace/docker-compose.yml) do
workspace: cada arquivo em `tools/scripts/` é montado individualmente em
`/docker-entrypoint-initdb.d/`, e o Postgres os executa **em ordem de nome, apenas em volume novo**.
A ordem atual é: `init-schemas` → migrations (`02`–`04`) → seeds (`05`–`07`) → migration extra (`08`).

O recurso de alerta de manutenção preventiva (plano 008) depende de uma nova tabela
`frotas.alertas_manutencao`, que precisa existir **antes** do app de frotas subir
(`spring.jpa.hibernate.ddl-auto=validate`). Este plano cria, no workspace e seguindo o padrão dos
demais scripts, **(1)** a migration dessa tabela e **(2)** um seed que popula o banco com **carros
elegíveis a manutenção preventiva**, para demonstrar o fluxo (job/endpoint geram os alertas a partir
desses carros).

### Regra de elegibilidade (do plano 008)
Um veículo ATIVO é elegível quando, desde a **baseline** (última `manutencao` `CONCLUIDA` ou último
`alerta_manutencao`, o mais recente; fallback = cadastro): `km_atual - baseline_km >= 10.000`
**OU** `hoje - baseline_data >= 6 meses`. (Data de referência atual do projeto: 2026-06-14.)

## Mudanças

### 1. Migration da tabela — `tools/scripts/09-add-alertas-manutencao.sql`
Segue o padrão dos demais (cabeçalho `-- RotaLog - ...`, `SET search_path TO frotas;`, idempotente):

```sql
-- RotaLog - API Frotas: tabela de alertas de manutenção preventiva
-- Script idempotente (pode ser executado múltiplas vezes)
-- Executar após os scripts 01-08

SET search_path TO frotas;

CREATE TABLE IF NOT EXISTS alertas_manutencao (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL,
    quilometragem_alerta BIGINT,
    motivo VARCHAR(20),                                 -- KM | TEMPO
    data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_notificacao VARCHAR(20) DEFAULT 'PENDENTE',  -- ENVIADA | FALHA | PENDENTE
    notificacao_id BIGINT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alertas_veiculo ON alertas_manutencao(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_status ON alertas_manutencao(status_notificacao);
```

### 2. Seed de carros elegíveis — `tools/scripts/10-seed-alertas-elegiveis.sql`
Insere veículos de demonstração **rotulados** e seus históricos de manutenção `CONCLUIDA`, calibrados
para serem elegíveis por cada motivo. Idempotente: `ON CONFLICT (placa) DO NOTHING` nos veículos
(placa é `UNIQUE`) e `WHERE NOT EXISTS` guardado por `descricao` distintiva nas manutenções; as
manutenções referenciam o veículo por subquery na placa (não dependem de IDs sequenciais).

Padrão (cabeçalho + `SET search_path TO frotas;`). Carros propostos:

| Placa | Modelo | KM atual | Última manut. CONCLUIDA | Elegível por |
|---|---|---|---|---|
| `MNT0A01` | Demo Elegível KM | 80000 | 65000 km, 2026-05-20 | **KM** (15.000 km desde a última) |
| `MNT0B02` | Demo Elegível Tempo | 30000 | 28000 km, 2025-06-01 | **TEMPO** (> 6 meses) |
| `MNT0C03` | Demo Elegível Ambos | 120000 | 100000 km, 2024-01-10 | **KM + TEMPO** |
| `MNT0D04` | Demo Não Elegível (controle) | 50000 | 49000 km, 2026-06-01 | — (controle negativo) |

Esqueleto:
```sql
SET search_path TO frotas;

INSERT INTO veiculos (placa, modelo, ano_fabricacao, quilometragem, status, data_cadastro, data_atualizacao) VALUES
('MNT0A01', 'Demo Elegível KM',    2021, 80000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0B02', 'Demo Elegível Tempo', 2022, 30000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0C03', 'Demo Elegível Ambos', 2019, 120000, 'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00'),
('MNT0D04', 'Demo Não Elegível',   2023, 50000,  'ATIVO', '2023-01-10 09:00:00', '2026-06-10 09:00:00')
ON CONFLICT (placa) DO NOTHING;

INSERT INTO manutencoes (veiculo_id, tipo_manutencao, data_manutencao, quilometragem_manutencao, custo, descricao, status, data_criacao, data_atualizacao)
SELECT v.id, 'PREVENTIVA', m.data_manut, m.km_manut, 700.00, m.descricao, 'CONCLUIDA', m.data_manut, m.data_manut
FROM (VALUES
    ('MNT0A01', TIMESTAMP '2026-05-20 08:00:00', 65000,  'Seed elegibilidade - baseline KM'),
    ('MNT0B02', TIMESTAMP '2025-06-01 08:00:00', 28000,  'Seed elegibilidade - baseline TEMPO'),
    ('MNT0C03', TIMESTAMP '2024-01-10 08:00:00', 100000, 'Seed elegibilidade - baseline AMBOS'),
    ('MNT0D04', TIMESTAMP '2026-06-01 08:00:00', 49000,  'Seed elegibilidade - controle negativo')
) AS m(placa, data_manut, km_manut, descricao)
JOIN veiculos v ON v.placa = m.placa
WHERE NOT EXISTS (
    SELECT 1 FROM manutencoes mx WHERE mx.veiculo_id = v.id AND mx.descricao = m.descricao
);

-- Verificação
SELECT v.placa, v.quilometragem, m.quilometragem_manutencao, m.data_manutencao, m.descricao
FROM veiculos v JOIN manutencoes m ON m.veiculo_id = v.id
WHERE v.placa LIKE 'MNT0%' ORDER BY v.placa;
```
*Obs.: o seed cria os carros elegíveis; quem gera os registros em `alertas_manutencao` é o app de
frotas (job agendado ou `POST /api/alertas-manutencao/verificar`).*

### 3. Montar os novos scripts no compose — [docker-compose.yml](../rotalog-workspace/docker-compose.yml)
Adicionar, após a linha do `08-...`, no bloco `volumes` do serviço `postgres`:
```yaml
      - ./tools/scripts/09-add-alertas-manutencao.sql:/docker-entrypoint-initdb.d/09-add-alertas-manutencao.sql
      - ./tools/scripts/10-seed-alertas-elegiveis.sql:/docker-entrypoint-initdb.d/10-seed-alertas-elegiveis.sql
```

### 4. Documentação
Mencionar os dois novos scripts no [README.md](../rotalog-workspace/README.md) / `CLAUDE_CONTEXT.md`, na
lista de scripts de init/seed, mantendo a descrição da ordem.

## Verificação

1. Recriar o banco do zero (os scripts de init só rodam em volume novo):
   ```bash
   cd "e:/Projetos ALURA - Carreira IA Native/rotalog/rotalog-workspace"
   docker compose down -v && docker compose up -d
   ```
2. Conferir a tabela e o seed:
   ```sql
   \dt frotas.alertas_manutencao
   SELECT placa, quilometragem FROM frotas.veiculos WHERE placa LIKE 'MNT0%';
   ```
3. Subir frotas (8080) + notificacoes (5000) e rodar `POST /api/alertas-manutencao/verificar`:
   - `MNT0A01` gera alerta com `motivo=KM`; `MNT0B02` com `motivo=TEMPO`; `MNT0C03` dispara (KM ou TEMPO);
   - `MNT0D04` **não** gera alerta (controle negativo).
4. Reexecutar os scripts manualmente (fora do init) deve ser inócuo — valida a idempotência.
