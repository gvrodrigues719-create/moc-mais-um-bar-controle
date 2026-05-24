-- ============================================================
-- MOC +1 Bar Controle — Módulo de Compras
-- Arquivo: 202605240003_purchases_module.sql
--
-- ATENÇÃO: Rodar SOMENTE no projeto Supabase dedicado do +1 Bar.
--          NUNCA rodar no projeto do NaBrasa Controle.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA: purchase_suppliers (Fornecedores)
-- ------------------------------------------------------------
CREATE TABLE purchase_suppliers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        text NOT NULL,
    whatsapp    text,
    category    text,
    notes       text,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER purchase_suppliers_updated_at
    BEFORE UPDATE ON purchase_suppliers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_purchase_suppliers_store_id ON purchase_suppliers(store_id);

-- ------------------------------------------------------------
-- 2. TABELA: item_purchase_parameters (Parâmetros de Estoque)
-- ------------------------------------------------------------
CREATE TABLE item_purchase_parameters (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id           uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    count_item_id      uuid NOT NULL REFERENCES count_items(id) ON DELETE CASCADE,
    supplier_id        uuid REFERENCES purchase_suppliers(id) ON DELETE SET NULL,
    min_stock          numeric,
    target_stock       numeric,
    purchase_unit      text,
    conversion_factor  numeric NOT NULL DEFAULT 1,
    replenishment_type text NOT NULL DEFAULT 'review', -- buy, produce, portion, review
    active             boolean NOT NULL DEFAULT true,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE(store_id, count_item_id)
);

CREATE TRIGGER item_purchase_parameters_updated_at
    BEFORE UPDATE ON item_purchase_parameters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_item_purchase_parameters_store_id ON item_purchase_parameters(store_id);
CREATE INDEX idx_item_purchase_parameters_item_id ON item_purchase_parameters(count_item_id);

-- ------------------------------------------------------------
-- 3. TABELA: purchase_suggestions (Sugestões de Compra - Cabeçalho)
-- ------------------------------------------------------------
CREATE TABLE purchase_suggestions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    count_session_id uuid NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
    status           text NOT NULL DEFAULT 'draft', -- draft, reviewed, approved, cancelled
    created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER purchase_suggestions_updated_at
    BEFORE UPDATE ON purchase_suggestions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_purchase_suggestions_store_id ON purchase_suggestions(store_id);
CREATE INDEX idx_purchase_suggestions_session_id ON purchase_suggestions(count_session_id);

-- ------------------------------------------------------------
-- 4. TABELA: purchase_suggestion_items (Sugestões de Compra - Itens)
-- ------------------------------------------------------------
CREATE TABLE purchase_suggestion_items (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id      uuid NOT NULL REFERENCES purchase_suggestions(id) ON DELETE CASCADE,
    count_item_id      uuid NOT NULL REFERENCES count_items(id) ON DELETE CASCADE,
    supplier_id        uuid REFERENCES purchase_suppliers(id) ON DELETE SET NULL,
    current_qty        numeric,
    min_stock          numeric,
    target_stock       numeric,
    suggested_qty      numeric,
    adjusted_qty       numeric,
    replenishment_type text NOT NULL DEFAULT 'review',
    status             text NOT NULL DEFAULT 'review', -- buy, produce, sufficient, review
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_suggestion_items_suggestion_id ON purchase_suggestion_items(suggestion_id);

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE purchase_suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_purchase_parameters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_suggestions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_suggestion_items   ENABLE ROW LEVEL SECURITY;

-- --- purchase_suppliers ---
CREATE POLICY "purchase_suppliers: manager and admin can select"
    ON purchase_suppliers FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "purchase_suppliers: admin can insert"
    ON purchase_suppliers FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "purchase_suppliers: admin can update"
    ON purchase_suppliers FOR UPDATE
    USING (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

-- --- item_purchase_parameters ---
CREATE POLICY "item_purchase_parameters: manager and admin can select"
    ON item_purchase_parameters FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "item_purchase_parameters: admin can insert"
    ON item_purchase_parameters FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "item_purchase_parameters: admin can update"
    ON item_purchase_parameters FOR UPDATE
    USING (
        store_id = current_store_id()
        AND current_user_role() = 'admin'
    );

-- --- purchase_suggestions ---
CREATE POLICY "purchase_suggestions: manager and admin can select"
    ON purchase_suggestions FOR SELECT
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "purchase_suggestions: manager and admin can insert"
    ON purchase_suggestions FOR INSERT
    WITH CHECK (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

CREATE POLICY "purchase_suggestions: manager and admin can update"
    ON purchase_suggestions FOR UPDATE
    USING (
        store_id = current_store_id()
        AND is_manager_or_admin()
    );

-- --- purchase_suggestion_items ---
CREATE POLICY "purchase_suggestion_items: manager and admin can select"
    ON purchase_suggestion_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM purchase_suggestions ps
            WHERE ps.id = suggestion_id
            AND ps.store_id = current_store_id()
            AND is_manager_or_admin()
        )
    );

CREATE POLICY "purchase_suggestion_items: manager and admin can insert"
    ON purchase_suggestion_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_suggestions ps
            WHERE ps.id = suggestion_id
            AND ps.store_id = current_store_id()
            AND is_manager_or_admin()
        )
    );

CREATE POLICY "purchase_suggestion_items: manager and admin can update"
    ON purchase_suggestion_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM purchase_suggestions ps
            WHERE ps.id = suggestion_id
            AND ps.store_id = current_store_id()
            AND is_manager_or_admin()
        )
    );
