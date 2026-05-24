'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
    .select('store_id, role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.store_id) return null
  if (profile.active !== true) return null
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
  const { error: logErr } = await supabase.from('operational_events').insert({
    store_id: ctx.storeId,
    actor_id: ctx.userId,
    event_type: 'item_updated',
    source_type: 'count_items',
    source_id: itemId,
    metadata: { fields: Object.keys(data) },
  })

  if (logErr) {
    return { success: false, error: 'Falha ao registrar log operacional: ' + logErr.message }
  }

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

// ─── USUÁRIOS ─────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string | null
  role: 'operator' | 'manager' | 'admin'
  active: boolean
  created_at: string
}

/**
 * Cria o client administrativo do Supabase usando a service role.
 * Roda estritamente no servidor.
 */
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('As variáveis do Supabase estão ausentes no servidor.')
  }
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Lista todos os perfis cadastrados na loja.
 * Ordena por role e nome.
 */
export async function getUsersAction(): Promise<{
  success: boolean
  error?: string
  users: AdminUser[]
}> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.', users: [] }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, active, created_at')
    .eq('store_id', ctx.storeId)
    .order('role', { ascending: true })
    .order('name', { ascending: true })

  if (error) return { success: false, error: error.message, users: [] }

  return { success: true, users: (data || []) as unknown as AdminUser[] }
}

/**
 * Atualiza um usuário (nome, cargo ou status ativo/inativo).
 * Bloqueia se o usuário logado tentar se inativar ou se rebaixar de cargo.
 */
export async function updateUserAction(
  userId: string,
  data: { name?: string; role?: 'operator' | 'manager' | 'admin'; active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão.' }

  // Evitar lockout: Usuário logado não pode se desativar nem alterar o próprio cargo.
  if (userId === ctx.userId) {
    if (data.active === false) {
      return { success: false, error: 'Você não pode desativar o próprio usuário.' }
    }
    if (data.role !== undefined && data.role !== ctx.role) {
      return { success: false, error: 'Você não pode alterar o próprio cargo.' }
    }
  }

  // Restrição de gerente (manager)
  if (ctx.role === 'manager') {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (!target || target.role !== 'operator') {
      return { success: false, error: 'Gerentes só podem atualizar operadores.' }
    }
    if (data.role !== undefined && data.role !== 'operator') {
      return { success: false, error: 'Gerentes só podem manter a permissão de operadores.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .eq('store_id', ctx.storeId)

  if (error) return { success: false, error: error.message }

  // Nota: Não registramos operational_event porque não há event_type apropriado no enum do banco (ex: user_updated)
  return { success: true }
}

/**
 * Cria um novo usuário no Auth e no Profile.
 * Apenas administradores (admin) podem cadastrar novos usuários.
 */
export async function createUserAction(data: {
  name: string
  email: string
  role: 'operator' | 'manager' | 'admin'
  password?: string
}): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  
  if (!ctx || ctx.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem cadastrar novos usuários.' }
  }

  const nameTrimmed = data.name.trim()
  const emailTrimmed = data.email.toLowerCase().trim()
  
  if (!nameTrimmed || !emailTrimmed) {
    return { success: false, error: 'Nome e e-mail são obrigatórios.' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrimmed)) {
    return { success: false, error: 'E-mail inválido.' }
  }

  const password = data.password ? data.password.trim() : Math.random().toString(36).substring(2, 10)
  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' }
  }

  try {
    const adminClient = getServiceRoleClient()

    // 1. Cria credenciais no Auth
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: emailTrimmed,
      password: password,
      email_confirm: true,
      user_metadata: { name: nameTrimmed },
    })

    if (authErr) {
      if (authErr.message.includes('already exists') || authErr.message.includes('already registered')) {
        return { success: false, error: 'Este e-mail já está cadastrado.' }
      }
      return { success: false, error: authErr.message }
    }

    if (!authUser?.user) {
      return { success: false, error: 'Falha ao criar usuário no Auth.' }
    }

    // 2. Insere na tabela profiles
    const { error: profileErr } = await adminClient
      .from('profiles')
      .insert({
        id: authUser.user.id,
        store_id: ctx.storeId,
        name: nameTrimmed,
        email: emailTrimmed,
        role: data.role,
        active: true,
      })

    if (profileErr) {
      // Reverter criação de credenciais se a tabela profile falhar para evitar inconsistência
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: `Erro ao criar perfil: ${profileErr.message}` }
    }

    // Nota: Não registramos operational_event porque não há event_type apropriado no enum do banco (ex: user_created)

    return {
      success: true,
      temporaryPassword: password,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Erro inesperado no servidor.'
    return { success: false, error: errMsg }
  }
}

// ─── GERENCIAMENTO DE ÁREAS (ETAPA 5) ──────────────────────────────────────────

export interface AdminAreaWithCounts {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  active: boolean
  total_items: number
  active_items: number
}

export interface UpdateAreaData {
  name: string
  description: string | null
  sort_order: number
  active: boolean
}

/**
 * Lista todas as áreas da loja com a contagem de itens totais e ativos vinculados.
 * Ordena por sort_order e name (ambos ascendentes).
 */
export async function getAreasAction(): Promise<{
  success: boolean
  error?: string
  areas: AdminAreaWithCounts[]
}> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.', areas: [] }

  // 1. Buscar áreas da loja
  const { data: areas, error: areasErr } = await supabase
    .from('count_areas')
    .select('id, name, slug, description, sort_order, active')
    .eq('store_id', ctx.storeId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (areasErr) return { success: false, error: areasErr.message, areas: [] }

  // 2. Buscar itens da loja para contabilizar por área
  const { data: items, error: itemsErr } = await supabase
    .from('count_items')
    .select('area_id, active')
    .eq('store_id', ctx.storeId)

  if (itemsErr) return { success: false, error: itemsErr.message, areas: [] }

  // 3. Consolidar as contagens na memória (performance rápida para volume pequeno)
  const countsMap: Record<string, { total: number; active: number }> = {}
  for (const area of areas) {
    countsMap[area.id] = { total: 0, active: 0 }
  }

  for (const item of items) {
    if (item.area_id && countsMap[item.area_id]) {
      countsMap[item.area_id].total++
      if (item.active) {
        countsMap[item.area_id].active++
      }
    }
  }

  const result: AdminAreaWithCounts[] = areas.map(area => ({
    id: area.id,
    name: area.name,
    slug: area.slug,
    description: area.description,
    sort_order: area.sort_order,
    active: area.active,
    total_items: countsMap[area.id]?.total || 0,
    active_items: countsMap[area.id]?.active || 0,
  }))

  return { success: true, areas: result }
}

/**
 * Atualiza os dados de uma área.
 * Bloqueia se o usuário não for admin.
 * Bloqueia se houver sessão de contagem em andamento.
 * Bloqueia inativação se a área possuir itens ativos vinculados.
 */
export async function updateAreaAction(
  areaId: string,
  data: UpdateAreaData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.' }

  // 1. Apenas administradores (admin) podem salvar alterações nas áreas
  if (ctx.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem editar áreas.' }
  }

  // 2. Segurança operacional: bloquear se houver contagem ativa em andamento
  const { data: activeSessions } = await supabase
    .from('count_sessions')
    .select('id')
    .eq('store_id', ctx.storeId)
    .eq('status', 'in_progress')
    .limit(1)

  if (activeSessions && activeSessions.length > 0) {
    return {
      success: false,
      error: 'Existe uma contagem em andamento. Finalize antes de editar áreas.',
    }
  }

  // 3. Regra para inativar área: não permitir inativar se houver itens ativos vinculados
  if (data.active === false) {
    const { count, error: countErr } = await supabase
      .from('count_items')
      .select('id', { count: 'exact', head: true })
      .eq('area_id', areaId)
      .eq('active', true)

    if (countErr) return { success: false, error: countErr.message }

    if (count && count > 0) {
      return {
        success: false,
        error: 'Esta área possui itens ativos. Inative ou mova os itens antes de desativar a área.',
      }
    }
  }

  // 4. Atualizar área no banco (slug é excluído da atualização para segurança operacional)
  const { error: updateErr } = await supabase
    .from('count_areas')
    .update({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      sort_order: data.sort_order,
      active: data.active,
    })
    .eq('id', areaId)
    .eq('store_id', ctx.storeId)

  if (updateErr) return { success: false, error: updateErr.message }

  // Nota: Não registramos operational_event nesta etapa porque 'area_updated' não existe no enum de banco

  return { success: true }
}

// ─── AUDITORIA DE SESSÕES (ETAPA 4 - SESSIONS) ──────────────────────────────────

export interface AdminSession {
  id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  started_at: string | null
  completed_at: string | null
  notes: string | null
  started_by_profile: { name: string } | null
  completed_by_profile: { name: string } | null
  total_items: number
  counted_items: number
  pending_items: number
}

/**
 * Lista todas as sessões de contagem da loja atual, incluindo
 * quem iniciou/finalizou e o quantitativo de itens contados/pendentes.
 */
export async function getSessionsAction(): Promise<{
  success: boolean
  error?: string
  sessions: AdminSession[]
}> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.', sessions: [] }

  // 1. Buscar sessões
  const { data: sessions, error: sessionsErr } = await supabase
    .from('count_sessions')
    .select(`
      id, status, started_at, completed_at, notes,
      started_by_profile:started_by ( name ),
      completed_by_profile:completed_by ( name )
    `)
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })

  if (sessionsErr) return { success: false, error: sessionsErr.message, sessions: [] }

  // 2. Buscar itens de contagem de todas as sessões da loja para consolidar estatísticas na memória
  const sessionIds = (sessions || []).map(s => s.id)
  if (sessionIds.length === 0) {
    return { success: true, sessions: [] }
  }

  const { data: sessionItems, error: itemsErr } = await supabase
    .from('count_session_items')
    .select('session_id, status')
    .in('session_id', sessionIds)

  if (itemsErr) return { success: false, error: itemsErr.message, sessions: [] }

  // 3. Agregar contagem por sessionId
  const statsMap: Record<string, { total: number; counted: number; pending: number }> = {}
  for (const sessionId of sessionIds) {
    statsMap[sessionId] = { total: 0, counted: 0, pending: 0 }
  }

  for (const item of (sessionItems || [])) {
    if (statsMap[item.session_id]) {
      statsMap[item.session_id].total++
      if (item.status === 'pending') {
        statsMap[item.session_id].pending++
      } else {
        statsMap[item.session_id].counted++
      }
    }
  }

  // 4. Formatar resultado
  const result: AdminSession[] = (sessions || []).map(s => ({
    id: s.id,
    status: s.status as AdminSession['status'],
    started_at: s.started_at,
    completed_at: s.completed_at,
    notes: s.notes,
    started_by_profile: Array.isArray(s.started_by_profile)
      ? (s.started_by_profile[0] as unknown as { name: string })
      : (s.started_by_profile as unknown as { name: string } | null),
    completed_by_profile: Array.isArray(s.completed_by_profile)
      ? (s.completed_by_profile[0] as unknown as { name: string })
      : (s.completed_by_profile as unknown as { name: string } | null),
    total_items: statsMap[s.id]?.total || 0,
    counted_items: statsMap[s.id]?.counted || 0,
    pending_items: statsMap[s.id]?.pending || 0,
  }))

  return { success: true, sessions: result }
}

/**
 * Cancela uma sessão de contagem em andamento ('in_progress') justificando o motivo.
 * Atualiza o status da contagem para 'cancelled' sem deletar do banco.
 * Apenas administradores e gerentes podem realizar esta operação.
 */
export async function cancelSessionAction(
  sessionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const ctx = await getAdminContext(supabase)
  if (!ctx) return { success: false, error: 'Sem permissão de acesso.' }

  const reasonTrimmed = reason.trim()
  if (!reasonTrimmed) {
    return { success: false, error: 'A justificativa de cancelamento é obrigatória.' }
  }

  // 1. Validar se a sessão existe, se pertence à loja e se está ativa ('in_progress')
  const { data: session, error: fetchErr } = await supabase
    .from('count_sessions')
    .select('id, status')
    .eq('id', sessionId)
    .eq('store_id', ctx.storeId)
    .maybeSingle()

  if (fetchErr || !session) {
    return { success: false, error: 'Sessão não localizada ou sem autorização.' }
  }
  if (session.status !== 'in_progress') {
    return { success: false, error: 'Apenas sessões em andamento podem ser canceladas.' }
  }

  // 2. Atualizar status para 'cancelled' e registrar motivo em notes
  const { error: updateErr } = await supabase
    .from('count_sessions')
    .update({
      status: 'cancelled',
      completed_by: ctx.userId,
      completed_at: new Date().toISOString(),
      notes: `Cancelada: ${reasonTrimmed}`,
    })
    .eq('id', sessionId)

  if (updateErr) return { success: false, error: updateErr.message }

  // 3. Registrar log de evento como 'count_session_completed' (único enum compatível no banco)
  // com metadados detalhando o cancelamento
  const { error: logErr } = await supabase.from('operational_events').insert({
    store_id: ctx.storeId,
    actor_id: ctx.userId,
    event_type: 'count_session_completed', // tipo enum do banco
    source_type: 'count_sessions',
    source_id: sessionId,
    metadata: {
      action: 'session_cancelled',
      reason: reasonTrimmed,
      completed_at: new Date().toISOString(),
    },
  })

  if (logErr) {
    return { success: false, error: 'Falha ao registrar log de cancelamento: ' + logErr.message }
  }

  return { success: true }
}


