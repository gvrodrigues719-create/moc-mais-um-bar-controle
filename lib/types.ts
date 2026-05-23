// ============================================================
// TIPOS CENTRAIS — MOC +1 Bar Controle
// ============================================================

// --- Perfis de usuário ---
export type UserRole = 'operator' | 'manager' | 'admin'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Operador',
  manager: 'Gerente',
  admin: 'Administrador',
}

// --- Status das áreas de contagem ---
export type AreaStatus = 'pending' | 'in_progress' | 'completed'

export const AREA_STATUS_LABELS: Record<AreaStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
}

// --- Status da sessão de contagem ---
export type CountStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled'

export const COUNT_STATUS_LABELS: Record<CountStatus, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

// --- Status de item dentro de uma sessão ---
export type CountItemStatus = 'pending' | 'counted' | 'zeroed' | 'skipped'

export const COUNT_ITEM_STATUS_LABELS: Record<CountItemStatus, string> = {
  pending: 'Pendente',
  counted: 'Contado',
  zeroed: 'Zerado',
  skipped: 'Pulado',
}

// --- Tipos de item ---
// IMPORTANTE: O tipo descreve a NATUREZA do produto, não a área física onde está.
// Exemplo: Iscas de Filé Mignon → prepared_portioned, armazenado no Freezer.
export type ItemType =
  | 'raw_material'
  | 'prepared_portioned'
  | 'finished_product'
  | 'beverage'
  | 'packaging'
  | 'cleaning_operational'

export const ITEM_TYPE_CONFIG: Record<
  ItemType,
  { label: string; description: string; color: string }
> = {
  raw_material: {
    label: 'Insumo Bruto',
    description:
      'Produto contado como chegou do fornecedor, antes de qualquer manipulação interna.',
    color: '#3B82F6',
  },
  prepared_portioned: {
    label: 'Preparados / Porcionados',
    description:
      'Produto que já passou por manipulação interna, pré-preparo, corte, tempero, produção ou porcionamento. Ex: iscas de filé mignon, blend porcionado, frango temperado, molho pronto.',
    color: '#F59E0B',
  },
  finished_product: {
    label: 'Produto Pronto',
    description: 'Produto final pronto para venda ou uso imediato.',
    color: '#10B981',
  },
  beverage: {
    label: 'Bebida',
    description: 'Bebidas alcoólicas, não alcoólicas, sucos, refrigerantes, águas.',
    color: '#6366F1',
  },
  packaging: {
    label: 'Descartáveis',
    description: 'Embalagens, copos, caixas, sacolas e materiais de acondicionamento.',
    color: '#8B5CF6',
  },
  cleaning_operational: {
    label: 'Limpeza / Operacional',
    description:
      'Produtos de limpeza, higiene e insumos operacionais não alimentares.',
    color: '#6B7280',
  },
}

// --- Tipos de evento operacional ---
export type OperationalEventType =
  | 'count_session_started'
  | 'count_session_completed'
  | 'count_item_counted'
  | 'count_item_zeroed'
  | 'area_started'
  | 'area_completed'
  | 'item_created'
  | 'item_updated'

// --- Estruturas de domínio ---

export interface Store {
  id: string
  name: string
  slug: string
  active: boolean
  created_at: string
}

export interface Profile {
  id: string
  store_id: string
  name: string
  email: string | null
  role: UserRole
  active: boolean
}

export interface CountArea {
  id: string
  store_id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  active: boolean
}

export interface CountItem {
  id: string
  store_id: string
  area_id: string | null
  name: string
  normalized_name: string | null
  item_type: ItemType
  unit: string
  unit_observation: string | null
  active: boolean
  sort_order: number
}

export interface CountSession {
  id: string
  store_id: string
  status: CountStatus
  started_by: string | null
  completed_by: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
}

export interface CountSessionItem {
  id: string
  session_id: string
  item_id: string
  area_id: string | null
  quantity: number | null
  status: CountItemStatus
  observation: string | null
  counted_by: string | null
  counted_at: string | null
}
