-- ============================================================
-- MOC +1 Bar Controle — Criar primeiro usuário admin
-- Arquivo: 03_create_first_admin_profile_template.sql
--
-- PRÉ-REQUISITO:
--   1. Schema (01_initial_schema.sql) já aplicado
--   2. Seed (02_seed_basic_store_and_areas.sql) já executado
--   3. Usuário criado em: Supabase → Authentication → Users
--      (Add user → Create new user → preencher email e senha)
--
-- COMO USAR:
--   1. Substituir COLE_AQUI_AUTH_USER_ID pelo UUID do usuário
--      criado em Authentication (copiar da coluna "UID")
--   2. Substituir COLE_AQUI_NOME pelo nome do administrador
--   3. Substituir COLE_AQUI_EMAIL pelo e-mail do administrador
--   4. Executar no SQL Editor
--
-- ⚠️  Não publicar este arquivo com dados reais preenchidos.
-- ============================================================

INSERT INTO profiles (id, store_id, name, email, role, active)
SELECT
    'COLE_AQUI_AUTH_USER_ID'::uuid,
    s.id,
    'COLE_AQUI_NOME',
    'COLE_AQUI_EMAIL',
    'admin',
    true
FROM stores s
WHERE s.slug = 'mais-um-bar';

-- Verificar resultado:
SELECT
    p.id,
    p.name,
    p.email,
    p.role,
    p.active,
    s.name AS store_name
FROM profiles p
JOIN stores s ON s.id = p.store_id
WHERE p.role = 'admin';

-- ============================================================
-- COMO CRIAR USUÁRIOS OPERADORES (depois de ter o admin):
--
-- 1. Criar usuário em Authentication → Users
-- 2. Executar:
--
-- INSERT INTO profiles (id, store_id, name, email, role, active)
-- SELECT
--     'UUID_DO_NOVO_USUARIO'::uuid,
--     s.id,
--     'Nome do Operador',
--     'operador@email.com',
--     'operator',   -- ou 'manager'
--     true
-- FROM stores s
-- WHERE s.slug = 'mais-um-bar';
-- ============================================================
