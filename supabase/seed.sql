-- ============================================================
-- MOC +1 Bar Controle — Seed inicial
-- Arquivo: supabase/seed.sql
--
-- Contém apenas: loja e áreas padrão.
-- NÃO contém itens reais — serão adicionados na Fase 3.
--
-- Como rodar:
--   No painel do Supabase → SQL Editor → colar e executar.
--   Ou via CLI: supabase db reset (inclui migrations + seed).
--
-- ATENÇÃO: Executar APENAS no projeto Supabase do +1 Bar.
--          NUNCA executar no projeto do NaBrasa Controle.
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
-- ÁREAS PADRÃO DA LOJA
-- Ordem definida por sort_order.
-- Itens serão associados a estas áreas na Fase 3.
-- ------------------------------------------------------------

INSERT INTO count_areas (store_id, name, slug, description, sort_order, active)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'Bar',
        'bar',
        'Área do bar: licores, destilados, fermentados, xaropes, frutas e insumos de drink.',
        1,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Cozinha',
        'cozinha',
        'Área da cozinha: proteínas, legumes, temperos, pré-preparados e produtos em uso.',
        2,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Estoque Seco',
        'estoque-seco',
        'Almoxarifado seco: grãos, enlatados, molhos, azeites, temperos secos e não perecíveis.',
        3,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Bebidas',
        'bebidas',
        'Bebidas prontas para venda: cervejas, refrigerantes, águas, sucos e energéticos.',
        4,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Freezer / Câmara',
        'freezer-camara',
        'Câmara fria e freezer: proteínas congeladas, pré-preparados porcionados e sorvetes.',
        5,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'Descartáveis',
        'descartaveis',
        'Embalagens, copos, talheres descartáveis, sacolas, papel e produtos de limpeza.',
        6,
        true
    )
ON CONFLICT (store_id, slug) DO NOTHING;

-- ------------------------------------------------------------
-- ITENS: vazio por enquanto.
-- Os itens reais (insumos, bebidas, descartáveis, etc.) serão
-- inseridos na Fase 3 via:
--   - Cadastro manual pelo admin no sistema
--   - Importação via CSV (script a ser criado)
-- ------------------------------------------------------------

-- Exemplo comentado de como ficará um item na Fase 3:
--
-- INSERT INTO count_items (store_id, area_id, name, item_type, unit, sort_order)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     (SELECT id FROM count_areas WHERE slug = 'cozinha' LIMIT 1),
--     'Filé Mignon (peça)',
--     'raw_material',
--     'kg',
--     1
-- );
--
-- INSERT INTO count_items (store_id, area_id, name, item_type, unit, sort_order)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     (SELECT id FROM count_areas WHERE slug = 'freezer-camara' LIMIT 1),
--     'Iscas de Filé Mignon',
--     'prepared_portioned',  -- já manipulado: cortado e temperado
--     'kg',
--     2
-- );

-- ============================================================
-- FIM DO SEED
-- ============================================================
