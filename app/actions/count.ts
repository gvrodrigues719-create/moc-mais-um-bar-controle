'use server'

import { createClient } from '@/lib/supabase/server'
import type { CountSession, CountSessionItem, OperationalEventType } from '@/lib/types'

/**
 * Busca a sessão de contagem atualmente em andamento ('in_progress')
 * vinculada à loja do usuário autenticado.
 */
export async function getActiveSessionAction(): Promise<CountSession | null> {
  const supabase = await createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.store_id) return null

  const { data: activeSession } = await supabase
    .from('count_sessions')
    .select('*')
    .eq('store_id', profile.store_id)
    .eq('status', 'in_progress')
    .maybeSingle()

  return activeSession as CountSession | null
}

/**
 * Inicializa uma nova sessão de contagem real.
 * 1. Verifica se já existe sessão em andamento.
 * 2. Cria uma nova sessão.
 * 3. Busca todos os itens ativos da loja.
 * 4. Insere todos os itens na tabela count_session_items.
 * 5. Registra o evento de início.
 */
export async function startSessionAction(): Promise<{ success: boolean; session?: CountSession; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return { success: false, error: 'Usuário não autenticado.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.store_id) {
      return { success: false, error: 'Perfil de usuário ou loja não encontrado.' }
    }

    // 1. Verificar se já existe uma sessão aberta
    const { data: existing } = await supabase
      .from('count_sessions')
      .select('*')
      .eq('store_id', profile.store_id)
      .eq('status', 'in_progress')
      .maybeSingle()

    if (existing) {
      return { success: true, session: existing as CountSession }
    }

    // 2. Criar nova sessão in_progress
    const { data: newSession, error: createErr } = await supabase
      .from('count_sessions')
      .insert({
        store_id: profile.store_id,
        status: 'in_progress',
        started_by: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createErr || !newSession) {
      return { success: false, error: 'Falha ao criar sessão de contagem: ' + createErr?.message }
    }

    // 3. Buscar todos os itens de contagem ativos da loja
    const { data: activeItems, error: itemsErr } = await supabase
      .from('count_items')
      .select('id, area_id')
      .eq('store_id', profile.store_id)
      .eq('active', true)

    if (itemsErr) {
      return { success: false, error: 'Falha ao buscar itens da loja: ' + itemsErr.message }
    }

    if (!activeItems || activeItems.length === 0) {
      return { success: false, error: 'Nenhum item ativo cadastrado nesta loja para contar.' }
    }

    // 4. Batch-insert na tabela count_session_items (copiando o area_id original do item)
    const sessionItems = activeItems.map(item => ({
      session_id: newSession.id,
      item_id: item.id,
      area_id: item.area_id,
      status: 'pending',
      quantity: null,
      observation: null,
    }))

    const { error: insertErr } = await supabase
      .from('count_session_items')
      .insert(sessionItems)

    if (insertErr) {
      // Rollback manual sutil deletando a sessão criada para integridade
      await supabase.from('count_sessions').delete().eq('id', newSession.id)
      return { success: false, error: 'Falha ao inicializar itens da sessão: ' + insertErr.message }
    }

    // 5. Registrar evento operacional
    await supabase.from('operational_events').insert({
      store_id: profile.store_id,
      actor_id: user.id,
      event_type: 'count_session_started' as OperationalEventType,
      source_type: 'count_sessions',
      source_id: newSession.id,
      metadata: { activeItemsCount: activeItems.length },
    })

    return { success: true, session: newSession as CountSession }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao iniciar sessão.' }
  }
}

/**
 * Salva ou atualiza a contagem de um item individual na sessão ativa.
 */
export async function updateSessionItemAction(
  sessionId: string,
  itemId: string,
  quantity: number,
  isZeroed: boolean,
  observation: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return { success: false, error: 'Usuário não autenticado.' }
    }

    // Obter dados do perfil para pegar o store_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.store_id) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    // 1. Atualizar o registro do item na sessão
    const newStatus = isZeroed ? 'zeroed' : 'counted'

    const { error: updateErr } = await supabase
      .from('count_session_items')
      .update({
        quantity: quantity,
        status: newStatus,
        observation: observation || null,
        counted_by: user.id,
        counted_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('item_id', itemId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // 2. Registrar evento operacional
    await supabase.from('operational_events').insert({
      store_id: profile.store_id,
      actor_id: user.id,
      event_type: (isZeroed ? 'count_item_zeroed' : 'count_item_counted') as OperationalEventType,
      source_type: 'count_session_items',
      source_id: itemId, // referência direta ao item_id
      metadata: { quantity, isZeroed, sessionId },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar item.' }
  }
}

/**
 * Encerra e finaliza uma sessão de contagem ativa se todos os itens foram contados/zerados.
 */
export async function completeSessionAction(
  sessionId: string,
  notes: string | null = null
): Promise<{ success: boolean; error?: string; pendingAreas?: Record<string, number> }> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return { success: false, error: 'Usuário não autenticado.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.store_id) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    // 1. Verificar se há algum item com status 'pending'
    const { data: pendingItems, error: fetchErr } = await supabase
      .from('count_session_items')
      .select('id, area_id')
      .eq('session_id', sessionId)
      .eq('status', 'pending')

    if (fetchErr) {
      return { success: false, error: 'Falha ao verificar itens pendentes: ' + fetchErr.message }
    }

    if (pendingItems && pendingItems.length > 0) {
      // Mapear quais áreas contêm itens pendentes
      const { data: areas } = await supabase
        .from('count_areas')
        .select('id, name')
        .eq('store_id', profile.store_id)

      const areaNameMap: Record<string, string> = {}
      areas?.forEach(a => {
        areaNameMap[a.id] = a.name
      })

      const pendingMap: Record<string, number> = {}
      pendingItems.forEach(item => {
        const areaName = item.area_id ? (areaNameMap[item.area_id] || 'Sem Área') : 'Sem Área'
        pendingMap[areaName] = (pendingMap[areaName] || 0) + 1
      })

      return {
        success: false,
        error: `Ainda existem ${pendingItems.length} itens pendentes de contagem.`,
        pendingAreas: pendingMap,
      }
    }

    // 2. Finalizar a sessão na tabela count_sessions
    const { error: completeErr } = await supabase
      .from('count_sessions')
      .update({
        status: 'completed',
        completed_by: user.id,
        completed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', sessionId)

    if (completeErr) {
      return { success: false, error: 'Falha ao salvar finalização no banco: ' + completeErr.message }
    }

    // 3. Registrar evento operacional
    await supabase.from('operational_events').insert({
      store_id: profile.store_id,
      actor_id: user.id,
      event_type: 'count_session_completed' as OperationalEventType,
      source_type: 'count_sessions',
      source_id: sessionId,
      metadata: { completed_at: new Date().toISOString() },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao finalizar sessão.' }
  }
}
