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

  // Registrar eventos operacionais
  let eventType = 'user_updated'
  if (data.active === false) eventType = 'user_deactivated'
  else if (data.active === true) eventType = 'user_activated'

  await supabase.from('operational_events').insert({
    store_id: ctx.storeId,
    actor_id: ctx.userId,
    event_type: eventType as any,
    source_type: 'profiles',
    source_id: userId,
    metadata: { fields: Object.keys(data) },
  })

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

    // 3. Registrar evento
    await adminClient.from('operational_events').insert({
      store_id: ctx.storeId,
      actor_id: ctx.userId,
      event_type: 'user_created',
      source_type: 'profiles',
      source_id: authUser.user.id,
      metadata: { role: data.role },
    })

    return {
      success: true,
      temporaryPassword: password,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado no servidor.' }
  }
}
