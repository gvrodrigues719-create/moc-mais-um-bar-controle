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
export type CountStatus = 'not_started' | 'in_progress' | 'completed'

export const COUNT_STATUS_LABELS: Record<CountStatus, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
}

// --- Tipos de item ---
// IMPORTANTE: O tipo de item NÃO é a área física onde está armazenado.
// Exemplo: Iscas de Filé (prepared_portioned) ficam no Freezer (área física).
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
      'Produto que já passou por manipulação interna: pré-preparo, corte, tempero, produção ou porcionamento. Ex: iscas de filé mignon, blend porcionado, frango temperado, molho pronto.',
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

// --- Estrutura de área ---
export interface Area {
  id: string
  name: string
  icon: string
  status: AreaStatus
  itemCount: number
}

// --- Estrutura de item ---
export interface CountItem {
  id: string
  name: string
  areaId: string
  type: ItemType
  unit: string
  active: boolean
}

// --- Estrutura de usuário ---
export interface User {
  id: string
  name: string
  role: UserRole
  store: string
}
