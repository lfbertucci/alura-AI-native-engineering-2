-- RotaLog - API Notificações Schema
-- Criação das tabelas no schema 'notificacoes'

SET search_path TO notificacoes;

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'email',
    destinatario VARCHAR(255) NOT NULL,
    assunto VARCHAR(255),
    mensagem TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    tentativas INTEGER NOT NULL DEFAULT 0,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    erro_mensagem TEXT,
    servico_origem VARCHAR(50),
    referencia_id VARCHAR(100),
    data_criacao TIMESTAMP DEFAULT NOW(),
    data_envio TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT NOW()
);

-- FIXME: Sem índices otimizados
-- FIXME: Sem particionamento por data

-- Tabela de templates
CREATE TABLE IF NOT EXISTS templates_notificacao (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'email',
    assunto_template VARCHAR(255),
    corpo_template TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT NOW(),
    data_atualizacao TIMESTAMP DEFAULT NOW()
);

-- Tabela de configurações de notificação
CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
    id BIGSERIAL PRIMARY KEY,
    destinatario VARCHAR(255) NOT NULL,
    canal_preferido VARCHAR(20) DEFAULT 'email',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    receber_email BOOLEAN NOT NULL DEFAULT TRUE,
    receber_sms BOOLEAN NOT NULL DEFAULT FALSE,
    receber_push BOOLEAN NOT NULL DEFAULT FALSE,
    horario_silencioso_inicio TIME,
    horario_silencioso_fim TIME,
    data_criacao TIMESTAMP DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON notificacoes(destinatario);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_criacao ON notificacoes(data_criacao);
CREATE INDEX IF NOT EXISTS idx_templates_tipo_canal ON templates_notificacao(tipo, canal);
