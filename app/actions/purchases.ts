'use server'

import { createClient } from '@/lib/supabase/server'
import type { ItemType } from '@/lib/types'

/**
 * Valida autenticação e retorna contexto de compras (admin/manager).
 * Operadores comuns são bloqueados.
 */
async function getPurchasesContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.store_id) return null
  if (profile.active !== true) return null
  if (!['admin', 'manager'].includes(profile.role)) return null

  return { userId: user.id, storeId: profile.store_id, role: profile.role as string }
}

// ─── FORNECEDORES (CRUD) ──────────────────────────────────────────────────────

export interface PurchaseSupplier {
  id: string
  store_id: string
  name: string
  whatsapp: string | null
  category: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export async function getSuppliersAction(): Promise<{
  success: boolean
  error?: string
  suppliers: PurchaseSupplier[]
}> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', suppliers: [] }

  const { data, error } = await supabase
    .from('purchase_suppliers')
    .select('*')
    .eq('store_id', ctx.storeId)
    .order('name', { ascending: true })

  if (error) return { success: false, error: error.message, suppliers: [] }
  return { success: true, suppliers: (data || []) as PurchaseSupplier[] }
}

export async function createSupplierAction(data: {
  name: string
  whatsapp?: string
  category?: string
  notes?: string
}): Promise<{ success: boolean; error?: string; supplier?: PurchaseSupplier }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.' }

  if (ctx.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem cadastrar fornecedores.' }
  }

  const nameTrimmed = data.name.trim()
  if (!nameTrimmed) {
    return { success: false, error: 'O nome do fornecedor é obrigatório.' }
  }

  const { data: newSupplier, error } = await supabase
    .from('purchase_suppliers')
    .insert({
      store_id: ctx.storeId,
      name: nameTrimmed,
      whatsapp: data.whatsapp?.trim() || null,
      category: data.category?.trim() || null,
      notes: data.notes?.trim() || null,
      active: true,
    })
    .select('*')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, supplier: newSupplier as PurchaseSupplier }
}

export async function updateSupplierAction(
  supplierId: string,
  data: {
    name?: string
    whatsapp?: string | null
    category?: string | null
    notes?: string | null
    active?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.' }

  if (ctx.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem editar fornecedores.' }
  }

  const updateData: Record<string, unknown> = { ...data }
  if (data.name !== undefined) {
    updateData.name = data.name.trim()
    if (!updateData.name) {
      return { success: false, error: 'O nome do fornecedor é obrigatório.' }
    }
  }

  const { error } = await supabase
    .from('purchase_suppliers')
    .update(updateData)
    .eq('id', supplierId)
    .eq('store_id', ctx.storeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── PARÂMETROS DE COMPRA ─────────────────────────────────────────────────────

export interface ItemWithParameter {
  id: string
  name: string
  unit: string
  item_type: ItemType
  area_id: string | null
  count_areas: { name: string } | null
  parameter: {
    id: string
    min_stock: number | null
    target_stock: number | null
    purchase_unit: string | null
    conversion_factor: number
    replenishment_type: 'buy' | 'produce' | 'portion' | 'review'
    supplier_id: string | null
    active: boolean
    notes: string | null
    purchase_suppliers?: { name: string } | null
  } | null
}

export async function getItemPurchaseParametersAction(): Promise<{
  success: boolean
  error?: string
  items: ItemWithParameter[]
}> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', items: [] }

  const { data: itemsData, error: itemsErr } = await supabase
    .from('count_items')
    .select(`
      id, name, unit, item_type, area_id,
      count_areas ( name )
    `)
    .eq('store_id', ctx.storeId)
    .eq('active', true)
    .order('name', { ascending: true })

  if (itemsErr) return { success: false, error: itemsErr.message, items: [] }

  const { data: paramsData } = await supabase
    .from('item_purchase_parameters')
    .select(`
      id, count_item_id, min_stock, target_stock, purchase_unit, conversion_factor,
      replenishment_type, supplier_id, active, notes,
      purchase_suppliers ( name )
    `)
    .eq('store_id', ctx.storeId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paramsMap: Record<string, any> = {}
  paramsData?.forEach(p => {
    paramsMap[p.count_item_id] = p
  })

  const result: ItemWithParameter[] = (itemsData || []).map((item) => {
    const p = paramsMap[item.id] || null
    const areasRaw = Array.isArray(item.count_areas) ? item.count_areas[0] : item.count_areas
    const areasVal = (areasRaw as unknown) as { name: string } | null
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      item_type: item.item_type,
      area_id: item.area_id,
      count_areas: areasVal,
      parameter: p
        ? {
            id: p.id,
            min_stock: p.min_stock !== null ? Number(p.min_stock) : null,
            target_stock: p.target_stock !== null ? Number(p.target_stock) : null,
            purchase_unit: p.purchase_unit,
            conversion_factor: Number(p.conversion_factor),
            replenishment_type: p.replenishment_type as 'buy' | 'produce' | 'portion' | 'review',
            supplier_id: p.supplier_id,
            active: p.active,
            notes: p.notes,
            purchase_suppliers: p.purchase_suppliers as { name: string } | null,
          }
        : null,
    }
  })

  return { success: true, items: result }
}

export async function saveItemPurchaseParameterAction(data: {
  count_item_id: string
  supplier_id?: string | null
  min_stock?: number | null
  target_stock?: number | null
  purchase_unit?: string | null
  conversion_factor?: number
  replenishment_type: 'buy' | 'produce' | 'portion' | 'review'
  active?: boolean
  notes?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.' }

  if (ctx.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem configurar parâmetros de compra.' }
  }

  const payload = {
    store_id: ctx.storeId,
    count_item_id: data.count_item_id,
    supplier_id: data.supplier_id || null,
    min_stock: data.min_stock !== undefined ? data.min_stock : null,
    target_stock: data.target_stock !== undefined ? data.target_stock : null,
    purchase_unit: data.purchase_unit?.trim() || null,
    conversion_factor: data.conversion_factor !== undefined ? data.conversion_factor : 1,
    replenishment_type: data.replenishment_type,
    active: data.active !== undefined ? data.active : true,
    notes: data.notes?.trim() || null,
  }

  const { error } = await supabase
    .from('item_purchase_parameters')
    .upsert(payload, { onConflict: 'store_id,count_item_id' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── SUGESTÕES DE COMPRA ──────────────────────────────────────────────────────

export interface CompletedSessionInfo {
  id: string
  completed_at: string | null
  notes: string | null
  completed_by_name: string | null
}

export async function getCompletedCountSessionsAction(): Promise<{
  success: boolean
  error?: string
  sessions: CompletedSessionInfo[]
}> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', sessions: [] }

  const { data, error } = await supabase
    .from('count_sessions')
    .select(`
      id, completed_at, notes,
      completed_by_profile:completed_by ( name )
    `)
    .eq('store_id', ctx.storeId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) return { success: false, error: error.message, sessions: [] }

  const sessions: CompletedSessionInfo[] = (data || []).map(s => {
    const profileRaw = Array.isArray(s.completed_by_profile) ? s.completed_by_profile[0] : s.completed_by_profile
    const profile = (profileRaw as unknown) as { name: string } | null
    return {
      id: s.id,
      completed_at: s.completed_at,
      notes: s.notes,
      completed_by_name: profile?.name || null,
    }
  })

  return { success: true, sessions }
}

export async function generatePurchaseSuggestionAction(
  countSessionId: string
): Promise<{ success: boolean; error?: string; suggestionId?: string }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.' }

  // 1. Carregar contagens concluídas da sessão
  const { data: countItems, error: countErr } = await supabase
    .from('count_session_items')
    .select('item_id, quantity, status')
    .eq('session_id', countSessionId)

  if (countErr) return { success: false, error: countErr.message }
  if (!countItems || countItems.length === 0) {
    return { success: false, error: 'Nenhum item contado encontrado nessa sessão.' }
  }

  // 2. Carregar parâmetros cadastrados para esta loja
  const { data: paramsData } = await supabase
    .from('item_purchase_parameters')
    .select('*')
    .eq('store_id', ctx.storeId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paramsMap: Record<string, any> = {}
  paramsData?.forEach(p => {
    paramsMap[p.count_item_id] = p
  })

  // 3. Criar sugestão
  const { data: suggestion, error: sugErr } = await supabase
    .from('purchase_suggestions')
    .insert({
      store_id: ctx.storeId,
      count_session_id: countSessionId,
      status: 'draft',
      created_by: ctx.userId,
    })
    .select('id')
    .single()

  if (sugErr || !suggestion) {
    return { success: false, error: sugErr?.message || 'Falha ao criar sugestão de compra.' }
  }

  // 4. Calcular e montar itens da sugestão
  const suggestionItemsPayload: {
    suggestion_id: string
    count_item_id: string
    supplier_id: string | null
    current_qty: number
    min_stock: number | null
    target_stock: number | null
    suggested_qty: number
    adjusted_qty: number
    replenishment_type: string
    status: 'buy' | 'produce' | 'sufficient' | 'review'
    notes: string | null
  }[] = []

  for (const cItem of countItems) {
    const itemId = cItem.item_id
    const currentQty = cItem.status === 'zeroed' ? 0 : (cItem.quantity !== null ? Number(cItem.quantity) : 0)
    const param = paramsMap[itemId] || null

    let minStock: number | null = null
    let targetStock: number | null = null
    let supplierId: string | null = null
    let replenishmentType = 'review'
    let suggestedQty = 0
    let status: 'buy' | 'produce' | 'sufficient' | 'review' = 'review'
    let itemNotes: string | null = null

    if (!param || param.min_stock === null || param.target_stock === null || param.active === false) {
      status = 'review'
      itemNotes = 'Sem parâmetro'
      replenishmentType = param?.replenishment_type || 'review'
      supplierId = param?.supplier_id || null
    } else {
      minStock = Number(param.min_stock)
      targetStock = Number(param.target_stock)
      supplierId = param.supplier_id
      replenishmentType = param.replenishment_type

      if (replenishmentType === 'review') {
        status = 'review'
        suggestedQty = 0
      } else if (replenishmentType === 'produce' || replenishmentType === 'portion') {
        suggestedQty = Math.max(0, targetStock - currentQty)
        status = 'produce'
      } else if (replenishmentType === 'buy') {
        if (currentQty <= minStock) {
          suggestedQty = Math.max(0, targetStock - currentQty)
          status = 'buy'
        } else {
          suggestedQty = 0
          status = 'sufficient'
        }
      }
    }

    suggestionItemsPayload.push({
      suggestion_id: suggestion.id,
      count_item_id: itemId,
      supplier_id: supplierId,
      current_qty: currentQty,
      min_stock: minStock,
      target_stock: targetStock,
      suggested_qty: suggestedQty,
      adjusted_qty: suggestedQty, // inicia igual sugerido
      replenishment_type: replenishmentType,
      status,
      notes: itemNotes,
    })
  }

  // 5. Inserir itens da sugestão
  const { error: itemsInsertErr } = await supabase
    .from('purchase_suggestion_items')
    .insert(suggestionItemsPayload)

  if (itemsInsertErr) {
    // Tenta apagar o cabeçalho para não deixar órfão
    await supabase.from('purchase_suggestions').delete().eq('id', suggestion.id)
    return { success: false, error: 'Falha ao inserir itens da sugestão: ' + itemsInsertErr.message }
  }

  return { success: true, suggestionId: suggestion.id }
}

export interface PurchaseSuggestionInfo {
  id: string
  created_at: string
  status: 'draft' | 'reviewed' | 'approved' | 'cancelled'
  notes: string | null
  creator_name: string | null
  session_date: string | null
}

export async function getPurchaseSuggestionsAction(): Promise<{
  success: boolean
  error?: string
  suggestions: PurchaseSuggestionInfo[]
}> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', suggestions: [] }

  const { data, error } = await supabase
    .from('purchase_suggestions')
    .select(`
      id, created_at, status, notes,
      created_by_profile:created_by ( name ),
      count_sessions ( completed_at )
    `)
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message, suggestions: [] }

  const suggestions: PurchaseSuggestionInfo[] = (data || []).map(s => {
    const profileRaw2 = Array.isArray(s.created_by_profile) ? s.created_by_profile[0] : s.created_by_profile
    const profile = (profileRaw2 as unknown) as { name: string } | null
    const sessionRaw = Array.isArray(s.count_sessions) ? s.count_sessions[0] : s.count_sessions
    const session = (sessionRaw as unknown) as { completed_at: string | null } | null
    return {
      id: s.id,
      created_at: s.created_at,
      status: s.status as 'draft' | 'reviewed' | 'approved' | 'cancelled',
      notes: s.notes,
      creator_name: profile?.name || null,
      session_date: session?.completed_at || null,
    }
  })

  return { success: true, suggestions }
}

export interface SuggestionDetailItem {
  id: string
  count_item_id: string
  item_name: string
  item_unit: string
  item_type: string
  supplier_id: string | null
  supplier_name: string | null
  supplier_whatsapp: string | null
  current_qty: number
  min_stock: number | null
  target_stock: number | null
  suggested_qty: number
  adjusted_qty: number
  replenishment_type: string
  status: 'buy' | 'produce' | 'sufficient' | 'review'
  notes: string | null
  purchase_unit: string | null
  conversion_factor: number
}

export async function getPurchaseSuggestionDetailAction(
  suggestionId: string
): Promise<{
  success: boolean
  error?: string
  suggestion?: PurchaseSuggestionInfo
  items: SuggestionDetailItem[]
}> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', items: [] }

  const { data: header, error: headErr } = await supabase
    .from('purchase_suggestions')
    .select(`
      id, created_at, status, notes,
      created_by_profile:created_by ( name ),
      count_sessions ( completed_at )
    `)
    .eq('id', suggestionId)
    .eq('store_id', ctx.storeId)
    .maybeSingle()

  if (headErr || !header) {
    return { success: false, error: headErr?.message || 'Sugestão não encontrada.', items: [] }
  }

  // Carregar os itens da sugestão, fazendo join com count_items e purchase_suppliers
  // E também o item_purchase_parameters para obtermos purchase_unit e conversion_factor no momento da contagem/sugestão
  const { data: itemsData, error: itemsErr } = await supabase
    .from('purchase_suggestion_items')
    .select(`
      id, count_item_id, current_qty, min_stock, target_stock, suggested_qty, adjusted_qty,
      replenishment_type, status, notes, supplier_id,
      count_items ( name, unit, item_type ),
      purchase_suppliers ( name, whatsapp )
    `)
    .eq('suggestion_id', suggestionId)

  if (itemsErr) return { success: false, error: itemsErr.message, items: [] }

  // Carregar parâmetros atuais para obter unidade de compra e fator de conversão
  const { data: paramsData } = await supabase
    .from('item_purchase_parameters')
    .select('count_item_id, purchase_unit, conversion_factor')
    .eq('store_id', ctx.storeId)

  const paramsMap: Record<string, { purchase_unit: string | null; conversion_factor: number }> = {}
  paramsData?.forEach(p => {
    paramsMap[p.count_item_id] = {
      purchase_unit: p.purchase_unit,
      conversion_factor: p.conversion_factor ? Number(p.conversion_factor) : 1,
    }
  })

  const items: SuggestionDetailItem[] = (itemsData || []).map(it => {
    const countItemRaw = Array.isArray(it.count_items) ? it.count_items[0] : it.count_items
    const countItem = (countItemRaw as unknown) as { name: string; unit: string; item_type: string } | null
    const supplierRaw = Array.isArray(it.purchase_suppliers) ? it.purchase_suppliers[0] : it.purchase_suppliers
    const supplier = (supplierRaw as unknown) as { name: string; whatsapp: string | null } | null
    const param = paramsMap[it.count_item_id] || { purchase_unit: null, conversion_factor: 1 }
    return {
      id: it.id,
      count_item_id: it.count_item_id,
      item_name: countItem?.name || 'Item Excluído',
      item_unit: countItem?.unit || 'UN',
      item_type: countItem?.item_type || 'other',
      supplier_id: it.supplier_id,
      supplier_name: supplier?.name || null,
      supplier_whatsapp: supplier?.whatsapp || null,
      current_qty: Number(it.current_qty || 0),
      min_stock: it.min_stock !== null ? Number(it.min_stock) : null,
      target_stock: it.target_stock !== null ? Number(it.target_stock) : null,
      suggested_qty: Number(it.suggested_qty || 0),
      adjusted_qty: Number(it.adjusted_qty || 0),
      replenishment_type: it.replenishment_type,
      status: it.status as 'buy' | 'produce' | 'sufficient' | 'review',
      notes: it.notes,
      purchase_unit: param.purchase_unit,
      conversion_factor: param.conversion_factor,
    }
  })

  const headerProfileRaw = Array.isArray(header.created_by_profile) ? header.created_by_profile[0] : header.created_by_profile
  const profile = (headerProfileRaw as unknown) as { name: string } | null
  const headerSessionRaw = Array.isArray(header.count_sessions) ? header.count_sessions[0] : header.count_sessions
  const session = (headerSessionRaw as unknown) as { completed_at: string | null } | null
  const suggestion: PurchaseSuggestionInfo = {
    id: header.id,
    created_at: header.created_at,
    status: header.status as 'draft' | 'reviewed' | 'approved' | 'cancelled',
    notes: header.notes,
    creator_name: profile?.name || null,
    session_date: session?.completed_at || null,
  }

  return { success: true, suggestion, items }
}

export async function updatePurchaseSuggestionItemAction(
  itemId: string,
  data: {
    adjusted_qty: number
    notes?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.' }

  if (data.adjusted_qty < 0) {
    return { success: false, error: 'A quantidade ajustada não pode ser negativa.' }
  }

  const { error } = await supabase
    .from('purchase_suggestion_items')
    .update({
      adjusted_qty: data.adjusted_qty,
      notes: data.notes?.trim() || null,
    })
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updatePurchaseSuggestionStatusAction(
  suggestionId: string,
  status: 'draft' | 'reviewed' | 'approved' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getPurchasesContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.' }

  const { error } = await supabase
    .from('purchase_suggestions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .eq('store_id', ctx.storeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
