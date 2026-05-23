-- ============================================================
-- MOC +1 Bar Controle — Seed: loja e áreas padrão
-- Arquivo: 02_seed_basic_store_and_areas.sql
--
-- COMO USAR:
--   Executar APÓS 01_initial_schema.sql no SQL Editor.
--
-- Supabase: maisumbar_controle (ehuodergymmzikxvzmbw)
-- ⚠️  Não contém itens reais — serão importados na Fase 3.
-- ============================================================

-- ------------------------------------------------------------
-- LOJA: +1 Bar
-- ------------------------------------------------------------
INSERT INTO stores (id, name, slug, active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+1 Bar',
    'mais-um-bar',
    true
)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- ÁREAS PADRÃO  (6 áreas iniciais)
-- Itens reais serão importados na Fase 3.
-- ------------------------------------------------------------
INSERT INTO count_areas (store_id, name, slug, description, sort_order, active)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'Bar',
        'bar',
        'Licores, destilados, fermentados, xaropes, frutas e insumos de drink.',
        1, true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Cozinha',
        'cozinha',
        'Proteínas, legumes, temperos, pré-preparados e produtos em uso.',
        2, true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Estoque Seco',
        'estoque-seco',
        'Grãos, enlatados, molhos, azeites, temperos secos e não perecíveis.',
        3, true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Bebidas',
        'bebidas',
        'Cervejas, refrigerantes, águas, sucos e energéticos prontos para venda.',
        4, true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Freezer / Câmara',
        'freezer-camara',
        'Proteínas congeladas, pré-preparados porcionados e sorvetes.',
        5, true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Descartáveis',
        'descartaveis',
        'Embalagens, copos, talheres descartáveis, sacolas e produtos de limpeza.',
        6, true
    )
ON CONFLICT (store_id, slug) DO NOTHING;

-- Verificar resultado:
SELECT id, name, slug, active FROM stores WHERE slug = 'mais-um-bar';
SELECT id, name, slug, sort_order FROM count_areas ORDER BY sort_order;

-- ============================================================
-- FIM DO SEED
-- Próximo passo: executar 03_create_first_admin_profile_template.sql
-- após criar o usuário no Supabase Auth.
-- ============================================================
