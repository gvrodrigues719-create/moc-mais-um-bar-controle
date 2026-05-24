'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, X, AlertCircle, Loader2, Check, Users, UserPlus, Shield, ChevronRight,
} from 'lucide-react'
import { USER_ROLE_LABELS, type UserRole } from '@/lib/types'
import { useStoreData } from '@/hooks/useStoreData'
import {
  getUsersAction,
  updateUserAction,
  createUserAction,
  type AdminUser,
} from '@/app/actions/admin'

type StatusFilter = 'all' | 'active' | 'inactive'
type ActionState = 'idle' | 'saving' | 'saved' | 'error'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'operator', label: 'Operador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'admin', label: 'Administrador' },
]

export default function AdminUsersPage() {
  const router = useRouter()

  // Auth context via hook
  const { loading: storeLoading, isConfigured, profile } = useStoreData()
  const currentUserId = profile?.id ?? null
  const currentUserRole = (profile?.role ?? null) as UserRole | null

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Filter states
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

  // Edit user state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; role: UserRole; active: boolean } | null>(null)
  const [editState, setEditState] = useState<ActionState>('idle')
  const [editError, setEditError] = useState('')

  // Create user state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'operator' as UserRole, password: '' })
  const [createState, setCreateState] = useState<ActionState>('idle')
  const [createError, setCreateError] = useState('')
  const [newlyCreatedPassword, setNewlyCreatedPassword] = useState<string | null>(null)

  // ─── Load data ────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await getUsersAction()
      if (res.success) {
        setUsers(res.users)
      } else {
        setLoadError(res.error || 'Erro ao carregar usuários.')
      }
    } catch {
      setLoadError('Erro de conexão ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (storeLoading) return
    if (isConfigured && (!profile || profile.role === 'operator')) {
      router.push('/dashboard')
      return
    }
    const timer = setTimeout(() => {
      loadUsers()
    }, 0)
    return () => clearTimeout(timer)
  }, [storeLoading, isConfigured, profile, router, loadUsers])

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
      const matchRole = !filterRole || u.role === filterRole
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? u.active : !u.active)
      return matchSearch && matchRole && matchStatus
    })
  }, [users, search, filterRole, filterStatus])

  // Summary counts
  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.active).length,
      inactive: users.filter(u => !u.active).length,
      adminsOrManagers: users.filter(u => ['admin', 'manager'].includes(u.role)).length,
    }
  }, [users])

  // ─── Edit modal functions ─────────────────────────────────────────────────

  function openEdit(user: AdminUser) {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      role: user.role,
      active: user.active,
    })
    setEditState('idle')
    setEditError('')
  }

  function closeEdit() {
    setEditingUser(null)
    setEditForm(null)
    setEditState('idle')
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!editingUser || !editForm) return

    const nameTrimmed = editForm.name.trim()
    if (!nameTrimmed) {
      setEditState('error')
      setEditError('O nome do usuário é obrigatório.')
      return
    }

    setEditState('saving')
    setEditError('')

    try {
      const res = await updateUserAction(editingUser.id, {
        name: nameTrimmed,
        role: editForm.role,
        active: editForm.active,
      })

      if (res.success) {
        setEditState('saved')
        // Optimistic UI update
        setUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id
              ? { ...u, name: nameTrimmed, role: editForm.role, active: editForm.active }
              : u
          )
        )
        setTimeout(closeEdit, 1200)
      } else {
        setEditState('error')
        setEditError(res.error || 'Erro ao atualizar usuário.')
      }
    } catch {
      setEditState('error')
      setEditError('Erro de conexão ao salvar.')
    }
  }

  // ─── Create user functions ───────────────────────────────────────────────

  function openCreate() {
    setCreateForm({ name: '', email: '', role: 'operator', password: '' })
    setCreateState('idle')
    setCreateError('')
    setNewlyCreatedPassword(null)
    setShowCreateModal(true)
  }

  function closeCreate() {
    setShowCreateModal(false)
    setNewlyCreatedPassword(null)
    setCreateState('idle')
    setCreateError('')
  }

  async function handleCreateUser() {
    const nameTrimmed = createForm.name.trim()
    const emailTrimmed = createForm.email.toLowerCase().trim()
    const passTrimmed = createForm.password.trim()

    if (!nameTrimmed || !emailTrimmed) {
      setCreateState('error')
      setCreateError('Nome e e-mail são obrigatórios.')
      return
    }

    if (passTrimmed && passTrimmed.length < 6) {
      setCreateState('error')
      setCreateError('A senha temporária deve conter no mínimo 6 caracteres.')
      return
    }

    setCreateState('saving')
    setCreateError('')

    try {
      const res = await createUserAction({
        name: nameTrimmed,
        email: emailTrimmed,
        role: createForm.role,
        password: passTrimmed || undefined,
      })

      if (res.success) {
        setCreateState('saved')
        setNewlyCreatedPassword(res.temporaryPassword || passTrimmed)
        // Refresh list
        loadUsers()
      } else {
        setCreateState('error')
        setCreateError(res.error || 'Erro ao criar usuário.')
      }
    } catch {
      setCreateState('error')
      setCreateError('Erro de conexão ao criar usuário.')
    }
  }

  // Helper checking permissions
  const isUserAdmin = currentUserRole === 'admin'
  const isUserManager = currentUserRole === 'manager'
  const canManage = isUserAdmin || isUserManager

  if (storeLoading) {
    return null
  }

  if (isConfigured && (!profile || profile.role === 'operator')) {
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-xs font-semibold text-gray-500">Carregando usuários...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 py-5 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/admin')}
              className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--border)' }}
              aria-label="Voltar ao admin"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Admin
              </p>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
                Usuários
              </h1>
            </div>
          </div>

          {isUserAdmin && (
            <button
              id="admin-users-create-btn"
              onClick={openCreate}
              className="py-2.5 px-4 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          )}
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: summary.total, text: 'var(--foreground)' },
            { label: 'Ativos', value: summary.active, text: '#16A34A' },
            { label: 'Inativos', value: summary.inactive, text: '#DC2626' },
            { label: 'Gestores', value: summary.adminsOrManagers, text: '#7C3AED' },
          ].map(({ label, value, text }) => (
            <div
              key={label}
              className="rounded-xl p-2.5 text-center border bg-white flex flex-col justify-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-lg font-black tracking-tight" style={{ color: text }}>
                {value}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Load errors */}
        {loadError && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2 border border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-700">{loadError}</p>
          </div>
        )}

        {/* Filters */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="admin-users-search"
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border text-xs font-semibold outline-none bg-white transition-all shadow-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            id="admin-users-filter-role"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="flex-1 min-w-0 text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white outline-none transition cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Cargos (Todos)</option>
            <option value="operator">Operador</option>
            <option value="manager">Gerente</option>
            <option value="admin">Administrador</option>
          </select>

          <select
            id="admin-users-filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as StatusFilter)}
            className="flex-1 min-w-0 text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white outline-none transition cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="all">Status (Todos)</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {/* Users list */}
        <div className="space-y-1.5">
          {filteredUsers.length === 0 ? (
            <div
              className="rounded-2xl p-10 border bg-white text-center space-y-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <Users className="w-9 h-9 mx-auto text-gray-200" />
              <p className="text-xs font-bold text-gray-500">Nenhum usuário encontrado</p>
              <p className="text-[10px] text-gray-400">Ajuste os filtros ou o termo de busca.</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isSelf = user.id === currentUserId
              const roleLabel = USER_ROLE_LABELS[user.role] || user.role

              return (
                <button
                  key={user.id}
                  onClick={() => openEdit(user)}
                  disabled={!canManage}
                  className={`w-full rounded-xl px-3.5 py-3 border bg-white flex items-center justify-between text-left transition-all duration-150 ${
                    canManage ? 'hover:border-gray-300 active:scale-[0.99] cursor-pointer' : 'cursor-default'
                  }`}
                  style={{
                    borderColor: 'var(--border)',
                    opacity: user.active ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          user.role === 'admin'
                            ? '#F5F3FF'
                            : user.role === 'manager'
                            ? '#EFF6FF'
                            : '#F9FAFB',
                      }}
                    >
                      <Shield
                        className="w-4.5 h-4.5"
                        style={{
                          color:
                            user.role === 'admin'
                              ? '#7C3AED'
                              : user.role === 'manager'
                              ? '#3B82F6'
                              : '#9CA3AF',
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--foreground)' }}>
                          {user.name}
                        </p>
                        {isSelf && (
                          <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 bg-gray-100 text-gray-500 rounded border">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">
                        {user.email} · {roleLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <span
                      className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        user.active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {canManage && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Modal Criar Usuário ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={closeCreate}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Novo Usuário</p>
                <h2 className="text-sm font-extrabold text-gray-800">Cadastrar no Sistema</h2>
              </div>
              <button
                onClick={closeCreate}
                className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                aria-label="Fechar cadastro"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              {newlyCreatedPassword ? (
                /* Exibição da senha temporária pós-criação */
                <div className="rounded-xl p-5 bg-green-50 border border-green-200 space-y-4">
                  <div className="flex items-center gap-2.5 text-green-800">
                    <Check className="w-5 h-5 shrink-0" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Usuário Criado com Sucesso!</h3>
                  </div>

                  <p className="text-xs text-green-700 leading-relaxed">
                    As credenciais de login foram criadas. Copie e envie a senha temporária abaixo para o usuário.
                    <span className="font-bold block mt-1">Ela não será exibida novamente!</span>
                  </p>

                  <div className="p-4 bg-white border border-green-200 rounded-xl space-y-2">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">E-mail de Acesso</span>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{createForm.email}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 font-black">Senha Temporária</span>
                      <p className="text-sm font-black text-green-700 tracking-wider mt-0.5 bg-green-50/50 p-2 rounded border border-green-100 text-center select-all">
                        {newlyCreatedPassword}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={closeCreate}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Entendido, credenciais copiadas
                  </button>
                </div>
              ) : (
                /* Formulário normal */
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="create-name" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Nome Completo *</label>
                    <input
                      id="create-name"
                      type="text"
                      value={createForm.name}
                      onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Carlos Mendes"
                      className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="create-email" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">E-mail *</label>
                    <input
                      id="create-email"
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Ex: operador@loja.com"
                      className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="create-role" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Cargo / Permissão *</label>
                    <select
                      id="create-role"
                      value={createForm.role}
                      onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="create-password" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Senha Temporária</label>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Deixe em branco para auto-gerar</span>
                    </div>
                    <input
                      id="create-password"
                      type="text"
                      value={createForm.password}
                      onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  {createState === 'error' && createError && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs font-semibold text-red-700">{createError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!newlyCreatedPassword && (
              <div className="px-5 py-4 border-t space-y-2.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
                <button
                  id="create-save-btn"
                  onClick={handleCreateUser}
                  disabled={createState === 'saving'}
                  className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  {createState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createState === 'saving' ? 'Cadastrando...' : 'Cadastrar Usuário'}
                </button>
                <button
                  onClick={closeCreate}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal Editar Usuário ────────────────────────────────────────────── */}
      {editingUser && editForm && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Editar Usuário</p>
                <h2 className="text-sm font-extrabold truncate max-w-[240px]" style={{ color: 'var(--foreground)' }}>
                  {editingUser.name}
                </h2>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                aria-label="Fechar edição"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Nome Completo *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-email-readonly" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">E-mail (Não editável)</label>
                <input
                  id="edit-email-readonly"
                  type="text"
                  readOnly
                  disabled
                  value={editingUser.email || ''}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-100 font-semibold text-gray-400 cursor-not-allowed"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-role" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Cargo / Permissão *</label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  disabled={editingUser.id === currentUserId} // Evitar auto-rebaixamento
                  onChange={e => setEditForm(prev => prev ? { ...prev, role: e.target.value as UserRole } : prev)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {editingUser.id === currentUserId && (
                  <p className="text-[9px] text-gray-400 font-semibold mt-1">
                    Você não pode alterar o próprio cargo para evitar a perda de privilégios.
                  </p>
                )}
              </div>

              {/* Status active/inactive toggle */}
              <div
                className="flex flex-col rounded-xl px-4 py-3.5 border bg-gray-50 space-y-2.5"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                      Status da Conta
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {editForm.active ? 'Ativa — acesso liberado' : 'Inativa — acesso bloqueado'}
                    </p>
                  </div>
                  <button
                    id="edit-active-toggle"
                    disabled={editingUser.id === currentUserId} // Evitar lockout
                    onClick={() => setEditForm(prev => prev ? { ...prev, active: !prev.active } : prev)}
                    className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={editForm.active ? { backgroundColor: 'var(--brand)' } : { backgroundColor: '#D1D5DB' }}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                        editForm.active ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {!editForm.active && (
                  <div className="rounded-lg p-2.5 bg-red-50 border border-red-200/50 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-semibold text-red-800 leading-relaxed">
                      <span className="font-bold">Aviso operacional:</span> Ao desativar, o usuário será deslogado imediatamente e impedido de acessar o sistema.
                    </p>
                  </div>
                )}
              </div>

              {editState === 'error' && editError && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">{editError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t space-y-2.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                id="edit-save-btn"
                onClick={handleSaveEdit}
                disabled={editState === 'saving'}
                className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
                style={{ backgroundColor: editState === 'saved' ? '#10B981' : 'var(--brand)' }}
              >
                {editState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {editState === 'saved' && <Check className="w-4 h-4" />}
                {editState === 'saving'
                  ? 'Salvando...'
                  : editState === 'saved'
                  ? 'Salvo!'
                  : 'Salvar Alterações'}
              </button>
              <button
                onClick={closeEdit}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
