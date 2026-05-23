// ============================================================
// MOCK DATA — MOC +1 Bar Controle
// Dados fictícios para desenvolvimento local.
// Substituir por integração real com Supabase.
// ============================================================

import { ItemType, AreaStatus, CountStatus, UserRole } from '@/lib/types'

// --- Usuário atual ---
export const MOCK_CURRENT_USER = {
  id: 'user-001',
  name: 'Carlos Mendes',
  role: 'operator' as UserRole,
  store: '+1 Bar',
}

// --- Perfis disponíveis ---
export const MOCK_PROFILES = [
  { id: 'user-001', name: 'Carlos Mendes', role: 'operator' as UserRole },
  { id: 'user-002', name: 'Ana Lima', role: 'manager' as UserRole },
  { id: 'user-003', name: 'Felipe Souza', role: 'admin' as UserRole },
]

// --- Áreas da loja ---
export const MOCK_AREAS = [
  { id: 'area-bar', name: 'Bar', icon: '🍹', status: 'pending' as AreaStatus, itemCount: 14 },
  { id: 'area-cozinha', name: 'Cozinha', icon: '🍳', status: 'completed' as AreaStatus, itemCount: 22 },
  { id: 'area-estoque', name: 'Estoque Seco', icon: '📦', status: 'in_progress' as AreaStatus, itemCount: 18 },
  { id: 'area-bebidas', name: 'Bebidas', icon: '🥤', status: 'pending' as AreaStatus, itemCount: 31 },
  { id: 'area-freezer', name: 'Freezer / Câmara', icon: '🧊', status: 'pending' as AreaStatus, itemCount: 9 },
  { id: 'area-descartaveis', name: 'Descartáveis', icon: '🥡', status: 'pending' as AreaStatus, itemCount: 12 },
]

// --- Status da contagem do dia ---
export const MOCK_TODAY_COUNT: {
  status: CountStatus
  date: string
  completedAreas: number
  totalAreas: number
  lastUpdate: string | null
} = {
  status: 'in_progress',
  date: new Date().toLocaleDateString('pt-BR'),
  completedAreas: 1,
  totalAreas: 6,
  lastUpdate: '09:42',
}

// --- Histórico recente ---
export const MOCK_HISTORY = [
  {
    id: 'sess-001',
    date: '22/05/2026',
    operator: 'Carlos Mendes',
    status: 'completed' as CountStatus,
    areasCompleted: 6,
    totalAreas: 6,
  },
  {
    id: 'sess-002',
    date: '21/05/2026',
    operator: 'Ana Lima',
    status: 'completed' as CountStatus,
    areasCompleted: 6,
    totalAreas: 6,
  },
  {
    id: 'sess-003',
    date: '20/05/2026',
    operator: 'Carlos Mendes',
    status: 'completed' as CountStatus,
    areasCompleted: 5,
    totalAreas: 6,
  },
]

// --- Itens de exemplo por tipo ---
export const MOCK_ITEMS = [
  // Bar
  { id: 'item-001', name: 'Limão Tahiti', areaId: 'area-bar', type: 'raw_material' as ItemType, unit: 'kg', active: true },
  { id: 'item-002', name: 'Hortelã', areaId: 'area-bar', type: 'raw_material' as ItemType, unit: 'maço', active: true },
  { id: 'item-003', name: 'Catuaba Selvagem 1L', areaId: 'area-bar', type: 'beverage' as ItemType, unit: 'un', active: true },
  { id: 'item-004', name: 'Batida de Maracujá pronta', areaId: 'area-bar', type: 'prepared_portioned' as ItemType, unit: 'litro', active: true },

  // Cozinha
  { id: 'item-005', name: 'Filé Mignon (peça)', areaId: 'area-cozinha', type: 'raw_material' as ItemType, unit: 'kg', active: true },
  { id: 'item-006', name: 'Iscas de Filé Mignon', areaId: 'area-cozinha', type: 'prepared_portioned' as ItemType, unit: 'kg', active: true },
  { id: 'item-007', name: 'Blend de Hambúrguer 180g', areaId: 'area-cozinha', type: 'prepared_portioned' as ItemType, unit: 'un', active: true },
  { id: 'item-008', name: 'Batata Pré-frita congelada', areaId: 'area-freezer', type: 'raw_material' as ItemType, unit: 'kg', active: true },

  // Estoque Seco
  { id: 'item-009', name: 'Azeite Extra Virgem 500ml', areaId: 'area-estoque', type: 'raw_material' as ItemType, unit: 'un', active: true },
  { id: 'item-010', name: 'Sal Refinado 1kg', areaId: 'area-estoque', type: 'raw_material' as ItemType, unit: 'un', active: true },
  { id: 'item-011', name: 'Molho Shoyu 500ml', areaId: 'area-estoque', type: 'raw_material' as ItemType, unit: 'un', active: true },

  // Bebidas
  { id: 'item-012', name: 'Heineken Long Neck 330ml', areaId: 'area-bebidas', type: 'beverage' as ItemType, unit: 'un', active: true },
  { id: 'item-013', name: 'Água Mineral 500ml', areaId: 'area-bebidas', type: 'beverage' as ItemType, unit: 'un', active: true },
  { id: 'item-014', name: 'Refrigerante Lata 350ml', areaId: 'area-bebidas', type: 'beverage' as ItemType, unit: 'un', active: true },

  // Descartáveis
  { id: 'item-015', name: 'Embalagem Delivery M', areaId: 'area-descartaveis', type: 'packaging' as ItemType, unit: 'un', active: true },
  { id: 'item-016', name: 'Copo Descartável 300ml', areaId: 'area-descartaveis', type: 'packaging' as ItemType, unit: 'un', active: true },
  { id: 'item-017', name: 'Detergente Neutro 500ml', areaId: 'area-descartaveis', type: 'cleaning_operational' as ItemType, unit: 'un', active: true },
]
