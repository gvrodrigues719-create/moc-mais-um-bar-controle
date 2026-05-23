-- ============================================================
-- MOC +1 Bar Controle — Schema completo
-- Arquivo: 01_initial_schema.sql
--
-- COMO USAR:
--   1. Abrir painel do Supabase → SQL Editor → New query
--   2. Colar este conteúdo
--   3. Clicar em Run
--
-- Supabase dedicado: maisumbar_controle
-- Project ref: ehuodergymmzikxvzmbw
--
-- ⚠️  Executar SOMENTE neste projeto Supabase.
-- ⚠️  NUNCA executar no projeto do NaBrasa Controle.
-- ============================================================

-- ------------------------------------------------------------
-- A. RESET SEGURO (idempotente)
-- Remove objetos deste módulo se já existirem, na ordem inversa
-- de dependência, para permitir re-execução limpa.
-- ------------------------------------------------------------

DROP TABLE IF EXISTS operational_events  CASCADE;
DROP TABLE IF EXISTS count_session_items CASCADE;
DROP TABLE IF EXISTS count_sessions      CASCADE;
DROP TABLE IF EXISTS count_items         CASCADE;
DROP TABLE IF EXISTS count_areas         CASCADE;
DROP TABLE IF EXISTS profiles            CASCADE;
DROP TABLE IF EXISTS stores              CASCADE;

DROP FUNCTION IF EXISTS is_manager_or_admin() CASCADE;
DROP FUNCTION IF EXISTS current_user_role()   CASCADE;
DROP FUNCTION IF EXISTS current_store_id()    CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()      CASCADE;

DROP TYPE IF EXISTS operational_event_type CASCADE;
DROP TYPE IF EXISTS count_item_status      CASCADE;
DROP TYPE IF EXISTS item_type              CASCADE;
DROP TYPE IF EXISTS area_status            CASCADE;
DROP TYPE IF EXISTS count_status           CASCADE;
DROP TYPE IF EXISTS user_role              CASCADE;

-- ------------------------------------------------------------
-- B. EXTENSÕES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- C. ENUMS
-- ------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'operator',
    'manager',
    'admin'
);

CREATE TYPE count_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE area_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);

CREATE TYPE item_type AS ENUM (
    'raw_material',          -- insumo bruto
    'prepared_portioned',    -- preparados / porcionados
    'finished_product',      -- produto pronto
    'beverage',              -- bebida
    'packaging',             -- descartáveis
    'cleaning_operational'   -- limpeza / operacional
);

CREATE TYPE count_item_status AS ENUM (
    'pending',
    'counted',
    'zeroed',
    'skipped'
);

CREATE TYPE operational_event_type AS ENUM (
    'count_session_started',
    'count_session_completed',
    'count_item_counted',
    'count_item_zeroed',
    'area_started',
    'area_completed',
    'item_created',
    'item_updated'
);

-- ------------------------------------------------------------
-- D. FUNÇÃO: atualizar updated_at automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- E. TABELA: stores
-- ------------------------------------------------------------
CREATE TABLE stores (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    slug       text        NOT NULL UNIQUE,
    active     boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- F. TABELA: profiles
-- ------------------------------------------------------------
CREATE TABLE profiles (
    id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id   uuid        REFERENCES stores(id) ON DELETE RESTRICT,
    name       text        NOT NULL,
    email      text,
    role       user_role   NOT NULL DEFAULT 'operator',
    active     boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_profiles_store_id ON profiles(store_id);
CREATE INDEX idx_profiles_role     ON profiles(role);

-- ------------------------------------------------------------
-- G. TABELA: count_areas
-- ------------------------------------------------------------
CREATE TABLE count_areas (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        text        NOT NULL,
    slug        text        NOT NULL,
    description text,
    sort_order  integer     NOT NULL DEFAULT 0,
    active      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (store_id, slug)
);

CREATE TRIGGER count_areas_updated_at
    BEFORE UPDATE ON count_areas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_areas_store_id ON count_areas(store_id);

-- ------------------------------------------------------------
-- H. TABELA: count_items  (nasce VAZIA — populada na Fase 3)
-- ------------------------------------------------------------
CREATE TABLE count_items (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    area_id          uuid        REFERENCES count_areas(id) ON DELETE SET NULL,
    name             text        NOT NULL,
    normalized_name  text,
    item_type        item_type   NOT NULL DEFAULT 'raw_material',
    unit             text        NOT NULL,
    unit_observation text,
    active           boolean     NOT NULL DEFAULT true,
    sort_order       integer     NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER count_items_updated_at
    BEFORE UPDATE ON count_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_items_store_id  ON count_items(store_id);
CREATE INDEX idx_count_items_area_id   ON count_items(area_id);
CREATE INDEX idx_count_items_item_type ON count_items(item_type);
CREATE INDEX idx_count_items_active    ON count_items(active);

-- ------------------------------------------------------------
-- I. TABELA: count_sessions
-- ------------------------------------------------------------
CREATE TABLE count_sessions (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id     uuid         NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    status       count_status NOT NULL DEFAULT 'not_started',
    started_by   uuid         REFERENCES profiles(id),
    completed_by uuid         REFERENCES profiles(id),
    started_at   timestamptz,
    completed_at timestamptz,
    notes        text,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER count_sessions_updated_at
    BEFORE UPDATE ON count_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_sessions_store_id ON count_sessions(store_id);
CREATE INDEX idx_count_sessions_status   ON count_sessions(status);

-- ------------------------------------------------------------
-- J. TABELA: count_session_items
-- ------------------------------------------------------------
CREATE TABLE count_session_items (
    id          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid              NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
    item_id     uuid              NOT NULL REFERENCES count_items(id) ON DELETE CASCADE,
    area_id     uuid              REFERENCES count_areas(id) ON DELETE SET NULL,
    quantity    numeric,
    status      count_item_status NOT NULL DEFAULT 'pending',
    observation text,
    counted_by  uuid              REFERENCES profiles(id),
    counted_at  timestamptz,
    created_at  timestamptz       NOT NULL DEFAULT now(),
    updated_at  timestamptz       NOT NULL DEFAULT now(),
    UNIQUE (session_id, item_id)
);

CREATE TRIGGER count_session_items_updated_at
    BEFORE UPDATE ON count_session_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_session_items_session ON count_session_items(session_id);
CREATE INDEX idx_count_session_items_item    ON count_session_items(item_id);

-- ------------------------------------------------------------
-- K. TABELA: operational_events  (append-only, sem updated_at)
-- ------------------------------------------------------------
CREATE TABLE operational_events (
    id          uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid                   NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    actor_id    uuid                   REFERENCES profiles(id),
    event_type  operational_event_type NOT NULL,
    source_type text,
    source_id   uuid,
    metadata    jsonb                  NOT NULL DEFAULT '{}',
    created_at  timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_op_events_store_id   ON operational_events(store_id);
CREATE INDEX idx_op_events_actor_id   ON operational_events(actor_id);
CREATE INDEX idx_op_events_event_type ON operational_events(event_type);

-- ------------------------------------------------------------
-- L. FUNÇÕES HELPER para RLS
-- Criadas APÓS profiles existir (referenciam a tabela).
-- SECURITY DEFINER: executam como dono da função — bypass RLS
-- apenas para leitura do profile do caller (padrão seguro).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT store_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role IN ('manager', 'admin') FROM profiles WHERE id = auth.uid()),
        false
    );
$$;

-- ============================================================
-- M. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE stores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_areas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_events  ENABLE ROW LEVEL SECURITY;

-- --- stores ---
CREATE POLICY "stores: ver própria loja"
    ON stores FOR SELECT
    USING (id = current_store_id());

-- --- profiles ---
CREATE POLICY "profiles: ver próprio perfil"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles: manager ver perfis da loja"
    ON profiles FOR SELECT
    USING (store_id = current_store_id() AND is_manager_or_admin());

CREATE POLICY "profiles: admin inserir perfis"
    ON profiles FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "profiles: admin atualizar perfis"
    ON profiles FOR UPDATE
    USING (store_id = current_store_id() AND current_user_role() = 'admin');

CREATE POLICY "profiles: manager atualizar operators"
    ON profiles FOR UPDATE
    USING (
        store_id = current_store_id()
        AND current_user_role() = 'manager'
        AND role = 'operator'
    );

-- --- count_areas ---
CREATE POLICY "count_areas: usuários da loja ver áreas"
    ON count_areas FOR SELECT
    USING (store_id = current_store_id());

CREATE POLICY "count_areas: manager inserir áreas"
    ON count_areas FOR INSERT
    WITH CHECK (store_id = current_store_id() AND is_manager_or_admin());

CREATE POLICY "count_areas: manager atualizar áreas"
    ON count_areas FOR UPDATE
    USING (store_id = current_store_id() AND is_manager_or_admin());

-- --- count_items ---
CREATE POLICY "count_items: usuários ver itens ativos"
    ON count_items FOR SELECT
    USING (store_id = current_store_id() AND active = true);

CREATE POLICY "count_items: manager ver todos itens"
    ON count_items FOR SELECT
    USING (store_id = current_store_id() AND is_manager_or_admin());

CREATE POLICY "count_items: manager inserir itens"
    ON count_items FOR INSERT
    WITH CHECK (store_id = current_store_id() AND is_manager_or_admin());

CREATE POLICY "count_items: manager atualizar itens"
    ON count_items FOR UPDATE
    USING (store_id = current_store_id() AND is_manager_or_admin());

-- --- count_sessions ---
CREATE POLICY "count_sessions: usuários da loja ver sessões"
    ON count_sessions FOR SELECT
    USING (store_id = current_store_id());

CREATE POLICY "count_sessions: usuários criar sessão"
    ON count_sessions FOR INSERT
    WITH CHECK (store_id = current_store_id());

CREATE POLICY "count_sessions: operator atualizar própria sessão in_progress"
    ON count_sessions FOR UPDATE
    USING (
        store_id = current_store_id()
        AND started_by = auth.uid()
        AND status = 'in_progress'
    );

CREATE POLICY "count_sessions: manager atualizar sessões"
    ON count_sessions FOR UPDATE
    USING (store_id = current_store_id() AND is_manager_or_admin());

-- --- count_session_items ---
CREATE POLICY "count_session_items: usuários da loja ver itens"
    ON count_session_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM count_sessions cs
            WHERE cs.id = session_id
            AND cs.store_id = current_store_id()
        )
    );

CREATE POLICY "count_session_items: inserir em sessão in_progress"
    ON count_session_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM count_sessions cs
            WHERE cs.id = session_id
            AND cs.store_id = current_store_id()
            AND cs.status = 'in_progress'
        )
    );

CREATE POLICY "count_session_items: atualizar em sessão in_progress"
    ON count_session_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM count_sessions cs
            WHERE cs.id = session_id
            AND cs.store_id = current_store_id()
            AND cs.status = 'in_progress'
        )
    );

-- --- operational_events ---
CREATE POLICY "operational_events: usuários inserir evento"
    ON operational_events FOR INSERT
    WITH CHECK (store_id = current_store_id());

CREATE POLICY "operational_events: manager ver eventos"
    ON operational_events FOR SELECT
    USING (store_id = current_store_id() AND is_manager_or_admin());

CREATE POLICY "operational_events: operator ver próprios eventos"
    ON operational_events FOR SELECT
    USING (store_id = current_store_id() AND actor_id = auth.uid());

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
