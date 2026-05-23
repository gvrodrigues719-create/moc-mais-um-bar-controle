-- ============================================================
-- MOC +1 Bar Controle — Migration inicial
-- Arquivo: 202605230001_initial_moc_mais_um_bar.sql
--
-- ATENÇÃO: Rodar SOMENTE no projeto Supabase dedicado do +1 Bar.
--          NUNCA rodar no projeto do NaBrasa Controle.
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSÕES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 2. ENUMS
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
    'raw_material',
    'prepared_portioned',
    'finished_product',
    'beverage',
    'packaging',
    'cleaning_operational'
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
-- 3. FUNÇÃO: atualizar updated_at automaticamente
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
-- 4. TABELA: stores
-- ------------------------------------------------------------

CREATE TABLE stores (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 5. TABELA: profiles
-- ------------------------------------------------------------

CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id    uuid REFERENCES stores(id) ON DELETE RESTRICT,
    name        text NOT NULL,
    email       text,
    role        user_role NOT NULL DEFAULT 'operator',
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_profiles_store_id ON profiles(store_id);
CREATE INDEX idx_profiles_role     ON profiles(role);

-- ------------------------------------------------------------
-- 6. TABELA: count_areas
-- ------------------------------------------------------------

CREATE TABLE count_areas (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        text NOT NULL,
    slug        text NOT NULL,
    description text,
    sort_order  integer NOT NULL DEFAULT 0,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(store_id, slug)
);

CREATE TRIGGER count_areas_updated_at
    BEFORE UPDATE ON count_areas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_areas_store_id ON count_areas(store_id);

-- ------------------------------------------------------------
-- 7. TABELA: count_items
-- Nasce vazia — itens serão cadastrados/importados na Fase 3.
-- ------------------------------------------------------------

CREATE TABLE count_items (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    area_id          uuid REFERENCES count_areas(id) ON DELETE SET NULL,
    name             text NOT NULL,
    normalized_name  text,
    item_type        item_type NOT NULL DEFAULT 'raw_material',
    unit             text NOT NULL,
    unit_observation text,
    active           boolean NOT NULL DEFAULT true,
    sort_order       integer NOT NULL DEFAULT 0,
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
-- 8. TABELA: count_sessions
-- ------------------------------------------------------------

CREATE TABLE count_sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    status       count_status NOT NULL DEFAULT 'not_started',
    started_by   uuid REFERENCES profiles(id),
    completed_by uuid REFERENCES profiles(id),
    started_at   timestamptz,
    completed_at timestamptz,
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER count_sessions_updated_at
    BEFORE UPDATE ON count_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_sessions_store_id ON count_sessions(store_id);
CREATE INDEX idx_count_sessions_status   ON count_sessions(status);

-- ------------------------------------------------------------
-- 9. TABELA: count_session_items
-- ------------------------------------------------------------

CREATE TABLE count_session_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
    item_id     uuid NOT NULL REFERENCES count_items(id) ON DELETE CASCADE,
    area_id     uuid REFERENCES count_areas(id) ON DELETE SET NULL,
    quantity    numeric,
    status      count_item_status NOT NULL DEFAULT 'pending',
    observation text,
    counted_by  uuid REFERENCES profiles(id),
    counted_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(session_id, item_id)
);

CREATE TRIGGER count_session_items_updated_at
    BEFORE UPDATE ON count_session_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_count_session_items_session_id ON count_session_items(session_id);
CREATE INDEX idx_count_session_items_item_id    ON count_session_items(item_id);

-- ------------------------------------------------------------
-- 10. TABELA: operational_events
-- Log de auditoria — append-only, sem updated_at.
-- ------------------------------------------------------------

CREATE TABLE operational_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    actor_id    uuid REFERENCES profiles(id),
    event_type  operational_event_type NOT NULL,
    source_type text,
    source_id   uuid,
    metadata    jsonb NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_operational_events_store_id   ON operational_events(store_id);
CREATE INDEX idx_operational_events_actor_id   ON operational_events(actor_id);
CREATE INDEX idx_operational_events_event_type ON operational_events(event_type);

-- ------------------------------------------------------------
-- 11. FUNÇÕES HELPER para RLS
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
-- 12. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE stores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_areas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_events  ENABLE ROW LEVEL SECURITY;

-- --- stores ---
CREATE POLICY "stores: select own store"
    ON stores FOR SELECT
    USING (id = current_store_id());

-- --- profiles ---
CREATE POLICY "profiles: select own"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles: manager can select store profiles"
    ON profiles FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "profiles: admin can insert"
    ON profiles FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "profiles: admin can update"
    ON profiles FOR UPDATE
    USING (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "profiles: manager can update operators"
    ON profiles FOR UPDATE
    USING (
        store_id = current_store_id()
        AND current_user_role() = 'manager'
        AND role = 'operator'
    );

-- --- count_areas ---
CREATE POLICY "count_areas: active users select"
    ON count_areas FOR SELECT
    USING (store_id = current_store_id());

CREATE POLICY "count_areas: manager can insert"
    ON count_areas FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "count_areas: manager can update"
    ON count_areas FOR UPDATE
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

-- --- count_items ---
CREATE POLICY "count_items: active users select active items"
    ON count_items FOR SELECT
    USING (store_id = current_store_id() AND active = true);

CREATE POLICY "count_items: manager can select all"
    ON count_items FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "count_items: manager can insert"
    ON count_items FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "count_items: manager can update"
    ON count_items FOR UPDATE
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

-- --- count_sessions ---
CREATE POLICY "count_sessions: users select own store"
    ON count_sessions FOR SELECT
    USING (store_id = current_store_id());

CREATE POLICY "count_sessions: operator can insert"
    ON count_sessions FOR INSERT
    WITH CHECK (store_id = current_store_id());

CREATE POLICY "count_sessions: operator can update own in_progress"
    ON count_sessions FOR UPDATE
    USING (
        store_id = current_store_id()
        AND started_by = auth.uid()
        AND status = 'in_progress'
    );

CREATE POLICY "count_sessions: manager can update"
    ON count_sessions FOR UPDATE
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

-- --- count_session_items ---
CREATE POLICY "count_session_items: users select own store"
    ON count_session_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM count_sessions cs
            WHERE cs.id = session_id
            AND cs.store_id = current_store_id()
        )
    );

CREATE POLICY "count_session_items: operator can insert in_progress"
    ON count_session_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM count_sessions cs
            WHERE cs.id = session_id
            AND cs.store_id = current_store_id()
            AND cs.status = 'in_progress'
        )
    );

CREATE POLICY "count_session_items: operator can update in_progress"
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
CREATE POLICY "operational_events: users can insert"
    ON operational_events FOR INSERT
    WITH CHECK (store_id = current_store_id());

CREATE POLICY "operational_events: manager can select"
    ON operational_events FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "operational_events: operator can select own"
    ON operational_events FOR SELECT
    USING (
        store_id = current_store_id()
        AND actor_id = auth.uid()
    );

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
