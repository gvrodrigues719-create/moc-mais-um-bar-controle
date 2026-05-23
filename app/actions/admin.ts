'use server'

import { createClient } from '@/lib/supabase/server'
import type { ItemType } from '@/lib/types'

/**
 * Recalcula o normalized_name de um item ao editar o name.
 * Regra: lowercase → remover acentos → trim → colapsar espaços múltiplos.
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Valida autenticação e retorna contexto de admin/manager.
 * Retorna null se o usuário não tiver role adequada.
 */
async function getAdminContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.store_id) return null
  if (!['admin', 'manager'].includes(profile.role)) return null

  return { userId: user.id, storeId: profile.store_id, role: profile.role as string }
}

// ─── VERIFICAÇÃO DE SESSÃO ATIVA ─────────────────────────────────────────────

/**
 * Verifica se existe alguma sessão de contagem em andamento.
 * Usado para exibir aviso de segurança operacional.
 */
export async function checkActiveSessionAction(): Promise<{ hasActive: boolean }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { hasActive: false }

  const { data } = await supabase
    .from('count_sessions')
    .select('id')
    .eq('store_id', ctx.storeId)
    .eq('status', 'in_progress')
    .limit(1)

  return { hasActive: (data?.length || 0) > 0 }
}

// ─── ITENS ───────────────────────────────────────────────────────────────────

export interface AdminItem {
  id: string
  name: string
  unit: string
  item_type: ItemType
  area_id: string | null
  active: boolean
  sort_order: number
  unit_observation: string | null
  count_areas: { id: string; name: string; slug: string } | null
}

/**
 * Lista todos os itens da loja (ativos e inativos) com join de área.
 * Apenas admin/manager pode chamar.
 */
export async function getItemsAction(): Promise<{
  success: boolean
  error?: string
  items: AdminItem[]
}> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', items: [] }

  const { data, error } = await supabase
    .from('count_items')
    .select(`
      id, name, unit, item_type, area_id, active, sort_order, unit_observation,
      count_areas ( id, name, slug )
    `)
    .eq('store_id', ctx.storeId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return { success: false, error: error.message, items: [] }

  return { success: true, items: (data || []) as unknown as AdminItem[] }
}

export interface UpdateItemData {
  name?: string
  unit?: string
  item_type?: ItemType
  area_id?: string | null
  active?: boolean
  sort_order?: number
  unit_observation?: string | null
}

/**
 * Atualiza os campos editáveis de um item.
 * Recalcula normalized_name automaticamente quando name for alterado.
 * Bloqueia edição se houver sessão de contagem em andamento.
 */
export async function updateItemAction(
  itemId: string,
  data: UpdateItemData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de edição.' }

  // Segurança operacional: bloquear se houver contagem ativa
  const { data: activeSessions } = await supabase
    .from('count_sessions')
    .select('id')
    .eq('store_id', ctx.storeId)
    .eq('status', 'in_progress')
    .limit(1)

  if (activeSessions && activeSessions.length > 0) {
    return {
      success: false,
      error: 'Existe uma contagem em andamento. Finalize a contagem antes de editar itens.',
    }
  }

  // Construir payload de update
  const updatePayload: Record<string, unknown> = { ...data }

  // Opção A: recalcular normalized_name ao editar name
  if (data.name !== undefined) {
    updatePayload.normalized_name = normalizeItemName(data.name)
  }

  const { error } = await supabase
    .from('count_items')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('store_id', ctx.storeId)

  if (error) return { success: false, error: error.message }

  // Registrar evento operacional de edição
  await supabase.from('operational_events').insert({
    store_id: ctx.storeId,
    actor_id: ctx.userId,
    event_type: 'item_updated',
    source_type: 'count_items',
    source_id: itemId,
    metadata: { fields: Object.keys(data) },
  })

  return { success: true }
}

// ─── ÁREAS (para filtros e selects) ──────────────────────────────────────────

export interface AdminArea {
  id: string
  name: string
  slug: string
  sort_order: number
  active: boolean
}

/**
 * Lista todas as áreas da loja para uso em dropdowns e filtros.
 */
export async function getAreasForAdminAction(): Promise<{
  success: boolean
  areas: AdminArea[]
}> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, areas: [] }

  const { data } = await supabase
    .from('count_areas')
    .select('id, name, slug, sort_order, active')
    .eq('store_id', ctx.storeId)
    .order('sort_order', { ascending: true })

  return { success: true, areas: (data || []) as AdminArea[] }
}
