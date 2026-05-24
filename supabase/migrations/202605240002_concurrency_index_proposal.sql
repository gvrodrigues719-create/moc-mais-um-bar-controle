-- ============================================================
-- PROPOSTA DE ÍNDICE DE CONCORRÊNCIA — +1 Bar Controle
-- Arquivo: supabase/migrations/202605240002_concurrency_index_proposal.sql
--
-- ATENÇÃO: Não aplicar automaticamente. Executar no Supabase
--          somente após aprovação explícita.
-- ============================================================

-- Garante que exista no máximo UMA sessão com status 'in_progress' por store_id.
-- Evita a condição de corrida quando múltiplos operadores tentam iniciar a contagem ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_count_sessions_one_active_per_store
ON count_sessions (store_id)
WHERE (status = 'in_progress');
