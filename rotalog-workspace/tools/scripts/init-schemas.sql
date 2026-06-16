-- RotaLog Database Initialization Script
-- Create schemas for each microservice

-- Create schema for api-frotas
CREATE SCHEMA IF NOT EXISTS frotas;

-- Create schema for api-entregas
CREATE SCHEMA IF NOT EXISTS entregas;

-- Create schema for api-notificacoes
CREATE SCHEMA IF NOT EXISTS notificacoes;

-- FIXME: api-notificacoes directly accesses frotas schema (service boundary violation)
-- This is intentional technical debt for the course

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA frotas TO rotalog_admin;
GRANT ALL PRIVILEGES ON SCHEMA entregas TO rotalog_admin;
GRANT ALL PRIVILEGES ON SCHEMA notificacoes TO rotalog_admin;

-- TODO: Create proper user roles
-- TODO: Add row-level security
-- TODO: Add audit tables
-- TODO: Add event sourcing tables
