'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Settings, Users, Lightbulb, ClipboardList, Plus, Search,
  Edit2, Copy, Loader2, Save, Phone, Info,
  ExternalLink, ChevronRight, X
} from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { ITEM_TYPE_CONFIG } from '@/lib/types'
import toast, { Toaster } from 'react-hot-toast'
import {
  getSuppliersAction,
  createSupplierAction,
  updateSupplierAction,
  getItemPurchaseParametersAction,
  saveItemPurchaseParameterAction,
  getCompletedCountSessionsAction,
  generatePurchaseSuggestionAction,
  getPurchaseSuggestionsAction,
  getPurchaseSuggestionDetailAction,
  updatePurchaseSuggestionItemAction,
  updatePurchaseSuggestionStatusAction,
  type PurchaseSupplier,
  type ItemWithParameter,
  type CompletedSessionInfo,
  type PurchaseSuggestionInfo,
  type SuggestionDetailItem
} from '@/app/actions/purchases'

type Section = 'parameters' | 'suppliers' | 'suggestions' | 'orders' | null

export default function PurchasesPage() {
  const router = useRouter()
  const { loading: storeLoading, isConfigured, profile, areas } = useStoreData()

  const isAdmin = profile?.role === 'admin'

  // Estado de navegação interna
  const [activeSection, setActiveSection] = useState<Section>(null)

  // ────────────────────────────────────────────────────────────────────────────
  // ESTADOS COMUNS & CARREGAMENTO
  // ────────────────────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<PurchaseSupplier[]>([])
  const [itemsWithParams, setItemsWithParams] = useState<ItemWithParameter[]>([])
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionInfo[]>([])
  const [suggestions, setSuggestions] = useState<PurchaseSuggestionInfo[]>([])

  const [loading, setLoading] = useState(false)

  // Carregar dados conforme a seção ativa
  const loadSuppliers = useCallback(async () => {
    const res = await getSuppliersAction()
    if (res.success) {
      setSuppliers(res.suppliers)
    } else {
      toast.error(res.error || 'Erro ao buscar fornecedores.')
    }
  }, [])

  const loadParameters = useCallback(async () => {
    const res = await getItemPurchaseParametersAction()
    if (res.success) {
      setItemsWithParams(res.items)
    } else {
      toast.error(res.error || 'Erro ao buscar parâmetros.')
    }
  }, [])

  const loadSessionsAndSuggestions = useCallback(async () => {
    setLoading(true)
    const [sessionsRes, sugRes] = await Promise.all([
      getCompletedCountSessionsAction(),
      getPurchaseSuggestionsAction()
    ])
    if (sessionsRes.success) {
      setCompletedSessions(sessionsRes.sessions)
    }
    if (sugRes.success) {
      setSuggestions(sugRes.suggestions)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (storeLoading) return
    if (isConfigured && (!profile || profile.role === 'operator')) {
      router.push('/dashboard')
      return
    }

    const timer = setTimeout(() => {
      if (activeSection === 'suppliers') {
        loadSuppliers()
      } else if (activeSection === 'parameters') {
        loadSuppliers() // parâmetros precisam da lista de fornecedores para dropdown
        loadParameters()
      } else if (activeSection === 'suggestions' || activeSection === 'orders') {
        loadSuppliers()
        loadSessionsAndSuggestions()
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [activeSection, storeLoading, isConfigured, profile, router, loadSuppliers, loadParameters, loadSessionsAndSuggestions])

  // ────────────────────────────────────────────────────────────────────────────
  // SEÇÃO: FORNECEDORES (CRUD)
  // ────────────────────────────────────────────────────────────────────────────
  const [editingSupplier, setEditingSupplier] = useState<PurchaseSupplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({ name: '', whatsapp: '', category: '', notes: '', active: true })
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)

  function openCreateSupplier() {
    if (!isAdmin) return
    setEditingSupplier(null)
    setSupplierForm({ name: '', whatsapp: '', category: '', notes: '', active: true })
    setShowSupplierModal(true)
  }

  function openEditSupplier(supplier: PurchaseSupplier) {
    if (!isAdmin) return
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      whatsapp: supplier.whatsapp || '',
      category: supplier.category || '',
      notes: supplier.notes || '',
      active: supplier.active
    })
    setShowSupplierModal(true)
  }

  async function handleSaveSupplier() {
    if (!isAdmin) return
    if (!supplierForm.name.trim()) {
      toast.error('O nome do fornecedor é obrigatório.')
      return
    }

    setSavingSupplier(true)
    try {
      if (editingSupplier) {
        const res = await updateSupplierAction(editingSupplier.id, supplierForm)
        if (res.success) {
          toast.success('Fornecedor atualizado com sucesso!')
          loadSuppliers()
          setShowSupplierModal(false)
        } else {
          toast.error(res.error || 'Erro ao atualizar fornecedor.')
        }
      } else {
        const res = await createSupplierAction(supplierForm)
        if (res.success) {
          toast.success('Fornecedor cadastrado com sucesso!')
          loadSuppliers()
          setShowSupplierModal(false)
        } else {
          toast.error(res.error || 'Erro ao cadastrar fornecedor.')
        }
      }
    } catch {
      toast.error('Erro de conexão ao salvar fornecedor.')
    } finally {
      setSavingSupplier(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SEÇÃO: PARÂMETROS DE COMPRA
  // ────────────────────────────────────────────────────────────────────────────
  const [paramSearch, setParamSearch] = useState('')
  const [paramAreaFilter, setParamAreaFilter] = useState('')
  const [paramTypeFilter, setParamTypeFilter] = useState('')
  const [editingParamItem, setEditingParamItem] = useState<ItemWithParameter | null>(null)
  const [paramForm, setParamForm] = useState({
    min_stock: '',
    target_stock: '',
    purchase_unit: '',
    conversion_factor: '1',
    replenishment_type: 'buy' as 'buy' | 'produce' | 'portion' | 'review',
    supplier_id: '',
    active: true,
    notes: ''
  })
  const [showParamModal, setShowParamModal] = useState(false)
  const [savingParam, setSavingParam] = useState(false)

  const filteredItemsWithParams = useMemo(() => {
    const q = paramSearch.toLowerCase().trim()
    return itemsWithParams.filter(item => {
      const matchSearch = !q || item.name.toLowerCase().includes(q)
      const matchArea = !paramAreaFilter || item.area_id === paramAreaFilter
      const matchType = !paramTypeFilter || item.item_type === paramTypeFilter
      return matchSearch && matchArea && matchType
    })
  }, [itemsWithParams, paramSearch, paramAreaFilter, paramTypeFilter])

  function openEditParam(item: ItemWithParameter) {
    if (!isAdmin) return
    setEditingParamItem(item)
    setParamForm({
      min_stock: item.parameter?.min_stock !== null && item.parameter?.min_stock !== undefined ? String(item.parameter.min_stock) : '',
      target_stock: item.parameter?.target_stock !== null && item.parameter?.target_stock !== undefined ? String(item.parameter.target_stock) : '',
      purchase_unit: item.parameter?.purchase_unit || '',
      conversion_factor: String(item.parameter?.conversion_factor ?? 1),
      replenishment_type: item.parameter?.replenishment_type || 'buy',
      supplier_id: item.parameter?.supplier_id || '',
      active: item.parameter?.active ?? true,
      notes: item.parameter?.notes || ''
    })
    setShowParamModal(true)
  }

  async function handleSaveParam() {
    if (!isAdmin || !editingParamItem) return

    const minVal = paramForm.min_stock.trim() === '' ? null : Number(paramForm.min_stock)
    const targetVal = paramForm.target_stock.trim() === '' ? null : Number(paramForm.target_stock)
    const convVal = Number(paramForm.conversion_factor) || 1

    if (minVal !== null && isNaN(minVal)) {
      toast.error('Estoque mínimo deve ser um número válido.')
      return
    }
    if (targetVal !== null && isNaN(targetVal)) {
      toast.error('Estoque ideal deve ser um número válido.')
      return
    }

    setSavingParam(true)
    try {
      const res = await saveItemPurchaseParameterAction({
        count_item_id: editingParamItem.id,
        supplier_id: paramForm.supplier_id || null,
        min_stock: minVal,
        target_stock: targetVal,
        purchase_unit: paramForm.purchase_unit,
        conversion_factor: convVal,
        replenishment_type: paramForm.replenishment_type,
        active: paramForm.active,
        notes: paramForm.notes
      })

      if (res.success) {
        toast.success('Parâmetros salvos com sucesso!')
        loadParameters()
        setShowParamModal(false)
      } else {
        toast.error(res.error || 'Erro ao salvar parâmetros.')
      }
    } catch {
      toast.error('Erro de conexão ao salvar parâmetros.')
    } finally {
      setSavingParam(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SEÇÃO: SUGESTÕES & DETALHES DE SUGESTÃO
  // ────────────────────────────────────────────────────────────────────────────
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [generatingSug, setGeneratingSug] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState<PurchaseSuggestionInfo | null>(null)
  const [suggestionItems, setSuggestionItems] = useState<SuggestionDetailItem[]>([])
  const [loadingSugDetails, setLoadingSugDetails] = useState(false)

  // Ajustes locais de itens de sugestão
  const [adjustedQtys, setAdjustedQtys] = useState<Record<string, string>>({})
  const [adjustedNotes, setAdjustedNotes] = useState<Record<string, string>>({})
  const [savingSugAdjustments, setSavingSugAdjustments] = useState(false)

  const loadSuggestionDetails = useCallback(async (id: string) => {
    setLoadingSugDetails(true)
    try {
      const res = await getPurchaseSuggestionDetailAction(id)
      if (res.success && res.suggestion) {
        setActiveSuggestion(res.suggestion)
        setSuggestionItems(res.items)

        // Sincronizar inputs
        const qtys: Record<string, string> = {}
        const notes: Record<string, string> = {}
        res.items.forEach(it => {
          qtys[it.id] = String(it.adjusted_qty)
          notes[it.id] = it.notes || ''
        })
        setAdjustedQtys(qtys)
        setAdjustedNotes(notes)
      } else {
        toast.error(res.error || 'Erro ao carregar detalhes da sugestão.')
      }
    } catch {
      toast.error('Erro de conexão ao carregar sugestão.')
    } finally {
      setLoadingSugDetails(false)
    }
  }, [])

  async function handleGenerateSuggestion() {
    if (!selectedSessionId) {
      toast.error('Selecione uma contagem finalizada.')
      return
    }

    setGeneratingSug(true)
    try {
      const res = await generatePurchaseSuggestionAction(selectedSessionId)
      if (res.success && res.suggestionId) {
        toast.success('Sugestão gerada com sucesso!')
        loadSessionsAndSuggestions()
        loadSuggestionDetails(res.suggestionId)
      } else {
        toast.error(res.error || 'Erro ao gerar sugestão.')
      }
    } catch {
      toast.error('Erro de conexão ao gerar sugestão.')
    } finally {
      setGeneratingSug(false)
    }
  }

  async function handleSaveSuggestionAdjustments(newStatus?: 'reviewed' | 'approved' | 'cancelled') {
    if (!activeSuggestion) return

    setSavingSugAdjustments(true)
    try {
      // Salvar cada item alterado
      const updatePromises = suggestionItems.map(async (it) => {
        const localQty = adjustedQtys[it.id]
        const localNote = adjustedNotes[it.id]

        const qtyNum = Number(localQty)
        if (isNaN(qtyNum) || qtyNum < 0) return

        if (qtyNum !== it.adjusted_qty || localNote !== (it.notes || '')) {
          await updatePurchaseSuggestionItemAction(it.id, {
            adjusted_qty: qtyNum,
            notes: localNote
          })
        }
      })

      await Promise.all(updatePromises)

      // Atualizar status se solicitado
      if (newStatus) {
        const res = await updatePurchaseSuggestionStatusAction(activeSuggestion.id, newStatus)
        if (!res.success) {
          toast.error(res.error || 'Erro ao atualizar status do pedido.')
        }
      }

      toast.success('Alterações salvas com sucesso!')
      loadSessionsAndSuggestions()
      loadSuggestionDetails(activeSuggestion.id)
    } catch {
      toast.error('Erro de conexão ao salvar alterações.')
    } finally {
      setSavingSugAdjustments(false)
    }
  }

  // Agrupamento dos itens da sugestão ativa
  const groupedSuggestionItems = useMemo(() => {
    const buy: SuggestionDetailItem[] = []
    const produce: SuggestionDetailItem[] = []
    const sufficient: SuggestionDetailItem[] = []
    const review: SuggestionDetailItem[] = []

    suggestionItems.forEach(it => {
      if (it.status === 'buy') buy.push(it)
      else if (it.status === 'produce') produce.push(it)
      else if (it.status === 'sufficient') sufficient.push(it)
      else review.push(it)
    })

    return { buy, produce, sufficient, review }
  }, [suggestionItems])

  // ────────────────────────────────────────────────────────────────────────────
  // SEÇÃO: PEDIDOS & CÓPIA POR FORNECEDOR
  // ────────────────────────────────────────────────────────────────────────────
  const [selectedOrderSugId, setSelectedOrderSugId] = useState('')
  const [orderItems, setOrderItems] = useState<SuggestionDetailItem[]>([])
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)

  const loadOrderDetails = useCallback(async (id: string) => {
    setLoadingOrderDetails(true)
    try {
      const res = await getPurchaseSuggestionDetailAction(id)
      if (res.success) {
        setOrderItems(res.items)
      } else {
        toast.error(res.error || 'Erro ao carregar itens do pedido.')
      }
    } catch {
      toast.error('Erro de conexão ao buscar pedido.')
    } finally {
      setLoadingOrderDetails(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedOrderSugId) {
        loadOrderDetails(selectedOrderSugId)
      } else {
        setOrderItems([])
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [selectedOrderSugId, loadOrderDetails])

  // Agrupar itens com quantidade > 0 por fornecedor
  const orderItemsBySupplier = useMemo(() => {
    const map: Record<string, { name: string; whatsapp: string | null; items: SuggestionDetailItem[] }> = {}
    
    orderItems.forEach(it => {
      // Usar a quantidade ajustada definida na sugestão
      if (it.adjusted_qty <= 0) return

      const supplierName = it.supplier_name || 'Sem fornecedor definido'
      if (!map[supplierName]) {
        map[supplierName] = {
          name: supplierName,
          whatsapp: it.supplier_whatsapp,
          items: []
        }
      }
      map[supplierName].items.push(it)
    })

    return Object.values(map)
  }, [orderItems])

  function handleCopyOrderText(supplierName: string, items: SuggestionDetailItem[]) {
    let text = `Pedido +1 Bar\n\n`
    text += `Fornecedor: ${supplierName}\n\n`
    
    items.forEach(it => {
      // Se houver unidade de compra e fator de conversão > 1, formata convertendo
      const factor = it.conversion_factor || 1
      if (it.purchase_unit && factor > 1) {
        const converted = it.adjusted_qty / factor
        text += `- ${it.item_name}: ${converted} ${it.purchase_unit} (fator ${factor} ${it.item_unit})\n`
      } else {
        text += `- ${it.item_name}: ${it.adjusted_qty} ${it.item_unit}\n`
      }
    })

    navigator.clipboard.writeText(text)
    toast.success(`Pedido para ${supplierName} copiado!`)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO
  // ────────────────────────────────────────────────────────────────────────────

  if (storeLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  // Seção Principal (Dashboard)
  if (activeSection === null) {
    return (
      <div className="space-y-5 py-5">
        <Toaster position="top-center" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Painel do Administrador
            </p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Compras
            </h1>
          </div>
        </div>

        {/* Informações da Loja */}
        <div className="rounded-2xl p-4 border bg-white shadow-sm flex items-start gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="p-2.5 rounded-xl border bg-gray-50 shrink-0" style={{ borderColor: 'var(--border)' }}>
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-tight text-gray-800">Abastecimento & Compras</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Gere listas automáticas por fornecedor a partir de limites de estoque mínimo e das contagens finalizadas.
            </p>
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="space-y-3">
          <button
            onClick={() => setActiveSection('parameters')}
            className="w-full rounded-xl p-4 border flex items-center justify-between bg-white hover:border-gray-300 transition-all active:scale-[0.99] cursor-pointer text-left shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-red-50 border border-red-100 mt-0.5">
                <Settings className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                  Parâmetros de Compra
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure estoque mínimo, estoque ideal e tipo de reposição dos itens.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => setActiveSection('suppliers')}
            className="w-full rounded-xl p-4 border flex items-center justify-between bg-white hover:border-gray-300 transition-all active:scale-[0.99] cursor-pointer text-left shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-red-50 border border-red-100 mt-0.5">
                <Users className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                  Fornecedores
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cadastre fornecedores e contatos usados nos pedidos.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => setActiveSection('suggestions')}
            className="w-full rounded-xl p-4 border flex items-center justify-between bg-white hover:border-gray-300 transition-all active:scale-[0.99] cursor-pointer text-left shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-red-50 border border-red-100 mt-0.5">
                <Lightbulb className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                  Sugestões de Compra
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gere listas de compra com base em contagens finalizadas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => setActiveSection('orders')}
            className="w-full rounded-xl p-4 border flex items-center justify-between bg-white hover:border-gray-300 transition-all active:scale-[0.99] cursor-pointer text-left shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-red-50 border border-red-100 mt-0.5">
                <ClipboardList className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                    Pedidos
                  </p>
                  <span className="text-[8px] font-black bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200">NOVO</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Revise pedidos e copie listas por fornecedor.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: PARÂMETROS
  // ────────────────────────────────────────────────────────────────────────────
  if (activeSection === 'parameters') {
    return (
      <div className="space-y-4 py-5">
        <Toaster position="top-center" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compras</p>
            <h1 className="text-base font-extrabold tracking-tight">Parâmetros de Compra</h1>
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 leading-relaxed font-medium">
              Apenas administradores podem editar os parâmetros de estoque. Visualização permitida.
            </p>
          </div>
        )}

        {/* Busca e Filtros */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar item..."
              value={paramSearch}
              onChange={(e) => setParamSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-xs font-semibold focus:outline-none focus:border-gray-400"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={paramAreaFilter}
              onChange={(e) => setParamAreaFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none focus:border-gray-400"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="">Todas as áreas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={paramTypeFilter}
              onChange={(e) => setParamTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none focus:border-gray-400"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="space-y-2">
          {filteredItemsWithParams.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs font-bold">
              Nenhum item cadastrado ou encontrado.
            </div>
          ) : (
            filteredItemsWithParams.map(item => {
              const typeCfg = ITEM_TYPE_CONFIG[item.item_type]
              const hasParam = item.parameter !== null && item.parameter !== undefined && item.parameter.min_stock !== null

              return (
                <button
                  key={item.id}
                  onClick={() => openEditParam(item)}
                  disabled={!isAdmin}
                  className={`w-full rounded-xl p-3 border flex items-center justify-between bg-white text-left transition-all ${
                    isAdmin ? 'hover:border-gray-300 active:scale-[0.99] cursor-pointer' : 'cursor-default'
                  }`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeCfg?.color || '#999' }} />
                      <p className="text-xs font-extrabold text-gray-800 truncate">{item.name}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold">
                      {typeCfg?.label} · {item.unit} · {item.count_areas?.name || 'Sem Área'}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      {hasParam ? (
                        <>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-gray-50 border-gray-200">
                            Reposição: {
                              item.parameter?.replenishment_type === 'buy' ? 'Comprar' :
                              item.parameter?.replenishment_type === 'produce' ? 'Produzir' :
                              item.parameter?.replenishment_type === 'portion' ? 'Porcionar' : 'Revisar'
                            }
                          </span>
                          <span className="text-[9px] font-black text-gray-600">
                            Mín: {item.parameter?.min_stock} / Ideal: {item.parameter?.target_stock}
                          </span>
                          {item.parameter?.purchase_suppliers && (
                            <span className="text-[8px] font-black uppercase text-red-800 bg-red-50 px-1 rounded border border-red-100">
                              {item.parameter.purchase_suppliers.name}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] font-extrabold text-gray-400 italic">
                          Parâmetros não configurados
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        {/* Modal de Parâmetros */}
        {showParamModal && editingParamItem && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-t-2xl p-5 space-y-4 animate-slide-up shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0 pr-3">
                  <h3 className="text-xs font-black uppercase text-gray-500 tracking-tight">Editar Parâmetros</h3>
                  <p className="text-sm font-bold text-gray-800 truncate">{editingParamItem.name}</p>
                </div>
                <button
                  onClick={() => setShowParamModal(false)}
                  className="p-1 rounded-lg border text-gray-400 hover:text-gray-600 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                      Estoque Mínimo ({editingParamItem.unit})
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 5"
                      value={paramForm.min_stock}
                      onChange={(e) => setParamForm(prev => ({ ...prev, min_stock: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                      Estoque Ideal ({editingParamItem.unit})
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 15"
                      value={paramForm.target_stock}
                      onChange={(e) => setParamForm(prev => ({ ...prev, target_stock: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Fornecedor Principal
                  </label>
                  <select
                    value={paramForm.supplier_id}
                    onChange={(e) => setParamForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="">Nenhum fornecedor definido</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                      Unidade de Compra
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Caixa, Fardo"
                      value={paramForm.purchase_unit}
                      onChange={(e) => setParamForm(prev => ({ ...prev, purchase_unit: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                      Fator de Conversão
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 12"
                      value={paramForm.conversion_factor}
                      onChange={(e) => setParamForm(prev => ({ ...prev, conversion_factor: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Tipo de Reposição
                  </label>
                  <select
                    value={paramForm.replenishment_type}
                    onChange={(e) => setParamForm(prev => ({ ...prev, replenishment_type: e.target.value as 'buy' | 'produce' | 'portion' | 'review' }))}
                    className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="buy">Comprar (Alerta estoque mínimo)</option>
                    <option value="produce">Produzir (Manipulação interna)</option>
                    <option value="portion">Porcionar (Divisão interna)</option>
                    <option value="review">Revisar (Solicitação sob demanda)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Observação Interna
                  </label>
                  <textarea
                    placeholder="Notas adicionais sobre o produto..."
                    value={paramForm.notes}
                    onChange={(e) => setParamForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border bg-white text-xs font-semibold focus:outline-none resize-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paramActive"
                    checked={paramForm.active}
                    onChange={(e) => setParamForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                  />
                  <label htmlFor="paramActive" className="text-xs font-extrabold text-gray-700">
                    Parâmetro Ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowParamModal(false)}
                  className="flex-1 py-3 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveParam}
                  disabled={savingParam}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  {savingParam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: FORNECEDORES
  // ────────────────────────────────────────────────────────────────────────────
  if (activeSection === 'suppliers') {
    return (
      <div className="space-y-4 py-5">
        <Toaster position="top-center" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection(null)}
              className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer bg-white"
              style={{ borderColor: 'var(--border)' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compras</p>
              <h1 className="text-base font-extrabold tracking-tight">Fornecedores</h1>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={openCreateSupplier}
              className="p-2.5 rounded-xl border hover:bg-gray-50 transition cursor-pointer bg-white shadow-sm flex items-center gap-1.5 text-xs font-bold"
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus className="w-4 h-4 text-red-800" />
              Novo
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 leading-relaxed font-medium">
              Apenas administradores podem cadastrar ou editar fornecedores. Visualização permitida.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {suppliers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border p-6 text-gray-400 text-xs font-bold shadow-sm" style={{ borderColor: 'var(--border)' }}>
              Nenhum fornecedor cadastrado ainda.
            </div>
          ) : (
            suppliers.map(sup => (
              <div
                key={sup.id}
                className="p-4 rounded-xl border bg-white shadow-sm space-y-2 flex items-start justify-between gap-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black uppercase text-gray-800 truncate">{sup.name}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      sup.active 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}>
                      {sup.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {sup.category && (
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wide mt-0.5">
                      Categoria: {sup.category}
                    </p>
                  )}
                  {sup.notes && (
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{sup.notes}</p>
                  )}
                  {sup.whatsapp && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <a
                        href={`https://wa.me/${sup.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-green-700 hover:underline flex items-center gap-0.5"
                      >
                        {sup.whatsapp}
                        <ExternalLink className="w-3 h-3 text-green-500" />
                      </a>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => openEditSupplier(sup)}
                    className="p-2 rounded-lg border text-gray-400 hover:text-red-800 hover:bg-red-50 hover:border-red-100 transition cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Fornecedor */}
        {showSupplierModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-t-2xl p-5 space-y-4 animate-slide-up shadow-xl">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-tight">
                  {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
                </h3>
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="p-1 rounded-lg border text-gray-400 hover:text-gray-600 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Nome do Fornecedor *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ambev, Distribuidora XYZ"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={supplierForm.whatsapp}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bebidas, Descartáveis, Horti"
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
                    Notas de Atendimento
                  </label>
                  <textarea
                    placeholder="Pedido mínimo, dia de entrega, observações..."
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none resize-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="supplierActive"
                    checked={supplierForm.active}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                  />
                  <label htmlFor="supplierActive" className="text-xs font-extrabold text-gray-700">
                    Fornecedor Ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-3 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSupplier}
                  disabled={savingSupplier}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  {savingSupplier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: SUGESTÕES DE COMPRA
  // ────────────────────────────────────────────────────────────────────────────
  if (activeSection === 'suggestions') {
    return (
      <div className="space-y-4 py-5">
        <Toaster position="top-center" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveSuggestion(null)
              setSuggestionItems([])
              setActiveSection(null)
            }}
            className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compras</p>
            <h1 className="text-base font-extrabold tracking-tight">Sugestões de Compra</h1>
          </div>
        </div>

        {/* Gerador de Sugestão */}
        {!activeSuggestion && (
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs font-black uppercase text-gray-800">Gerar Nova Sugestão</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Selecione uma sessão de contagem finalizada para rodar o algoritmo de sugestão de compras.
              </p>
            </div>

            <div className="space-y-3">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none focus:border-gray-400"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="">Selecione uma contagem...</option>
                {completedSessions.map(s => {
                  const dateStr = s.completed_at ? new Date(s.completed_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  }) : 'Sem data'
                  return (
                    <option key={s.id} value={s.id}>
                      {dateStr} {s.completed_by_name ? `(${s.completed_by_name})` : ''} - {s.notes || 'Sem observação'}
                    </option>
                  )
                })}
              </select>

              <button
                onClick={handleGenerateSuggestion}
                disabled={generatingSug || !selectedSessionId}
                className="w-full py-3 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {generatingSug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                Gerar sugestão de compras
              </button>
            </div>
          </div>
        )}

        {/* Sugestões Antigas */}
        {!activeSuggestion && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest pl-1 text-gray-400">Sugestões Salvas</p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                Nenhuma sugestão de compra gerada ainda.
              </div>
            ) : (
              suggestions.map(sug => {
                const dateStr = new Date(sug.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })
                return (
                  <button
                    key={sug.id}
                    onClick={() => loadSuggestionDetails(sug.id)}
                    className="w-full rounded-xl p-3 border flex items-center justify-between bg-white text-left shadow-sm hover:border-gray-300 transition-all active:scale-[0.99] cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black uppercase text-gray-800">Lista de {dateStr}</p>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          sug.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                          sug.status === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          sug.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {
                            sug.status === 'approved' ? 'Aprovado' :
                            sug.status === 'reviewed' ? 'Revisado' :
                            sug.status === 'cancelled' ? 'Cancelado' : 'Rascunho'
                          }
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                        Por: {sug.creator_name || 'Desconhecido'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Visualizador / Editor de Detalhes da Sugestão */}
        {activeSuggestion && (
          <div className="space-y-4">
            {/* Header Detalhes */}
            <div className="p-4 rounded-xl border bg-white shadow-sm flex items-start justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Sugestão Ativa</p>
                <h3 className="text-xs font-black uppercase text-gray-800 mt-0.5">
                  Lista de {new Date(activeSuggestion.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                  Status: <span className="text-red-800">{activeSuggestion.status.toUpperCase()}</span> · Criador: {activeSuggestion.creator_name}
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveSuggestion(null)
                  setSuggestionItems([])
                }}
                className="p-1 rounded-lg border text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-50 cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                Fechar
              </button>
            </div>

            {loadingSugDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* BLOCO: COMPRAR */}
                {groupedSuggestionItems.buy.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-1 text-red-800">1. Comprar (Estoque Baixo)</p>
                    <div className="space-y-2">
                      {groupedSuggestionItems.buy.map(it => renderSuggestionItemRow(it))}
                    </div>
                  </div>
                )}

                {/* BLOCO: PRODUZIR */}
                {groupedSuggestionItems.produce.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-1 text-amber-600">2. Produzir / Porcionar Internamente</p>
                    <div className="space-y-2">
                      {groupedSuggestionItems.produce.map(it => renderSuggestionItemRow(it))}
                    </div>
                  </div>
                )}

                {/* BLOCO: SEM PARÂMETRO */}
                {groupedSuggestionItems.review.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-1 text-gray-400">3. Sem Parâmetro / Revisar</p>
                    <div className="space-y-2">
                      {groupedSuggestionItems.review.map(it => renderSuggestionItemRow(it))}
                    </div>
                  </div>
                )}

                {/* BLOCO: SUFICIENTE */}
                {groupedSuggestionItems.sufficient.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-1 text-green-700">4. Suficiente (Não precisa comprar)</p>
                    <div className="space-y-2">
                      {groupedSuggestionItems.sufficient.map(it => renderSuggestionItemRow(it))}
                    </div>
                  </div>
                )}

                {/* Ações de Sugestão */}
                <div className="p-4 rounded-xl border bg-white shadow-sm space-y-2.5 sticky bottom-1 z-30" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => handleSaveSuggestionAdjustments()}
                    disabled={savingSugAdjustments}
                    className="w-full py-3 rounded-xl border text-xs font-black uppercase text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {savingSugAdjustments ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar Ajustes do Rascunho
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSaveSuggestionAdjustments('cancelled')}
                      disabled={savingSugAdjustments}
                      className="py-3 rounded-xl border text-[10px] font-black uppercase text-red-700 bg-red-50 hover:bg-red-100 border-red-200 transition cursor-pointer"
                    >
                      Cancelar Lista
                    </button>
                    <button
                      onClick={() => handleSaveSuggestionAdjustments('approved')}
                      disabled={savingSugAdjustments}
                      className="py-3 rounded-xl text-[10px] font-black uppercase text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1"
                      style={{ backgroundColor: 'var(--brand)' }}
                    >
                      Aprovar Lista
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Row renderer auxiliar para itens de sugestão
  function renderSuggestionItemRow(it: SuggestionDetailItem) {
    const qtyVal = adjustedQtys[it.id] ?? ''
    const noteVal = adjustedNotes[it.id] ?? ''

    return (
      <div
        key={it.id}
        className="p-3.5 rounded-xl border bg-white shadow-sm space-y-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-800 truncate">{it.item_name}</p>
            <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5">
              Contado: {it.current_qty} {it.item_unit} · Mín: {it.min_stock ?? '-'} · Ideal: {it.target_stock ?? '-'}
            </p>
            <p className="text-[9px] font-black text-red-800 mt-1 uppercase">
              Fornecedor: {it.supplier_name || 'Não definido'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-gray-400 uppercase font-black tracking-tight block">Sugerido</span>
            <span className="text-xs font-black text-gray-700 block mt-0.5">
              {it.suggested_qty} {it.item_unit}
            </span>
          </div>
        </div>

        {/* Inputs de Ajuste */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed" style={{ borderColor: 'var(--border)' }}>
          <div className="col-span-1">
            <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Ajustado ({it.item_unit})</label>
            <input
              type="number"
              value={qtyVal}
              onChange={(e) => setAdjustedQtys(prev => ({ ...prev, [it.id]: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border bg-white text-xs font-black focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div className="col-span-2">
            <label className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Observação</label>
            <input
              type="text"
              placeholder="Ex: pedido urgente..."
              value={noteVal}
              onChange={(e) => setAdjustedNotes(prev => ({ ...prev, [it.id]: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border bg-white text-xs font-semibold focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: PEDIDOS
  // ────────────────────────────────────────────────────────────────────────────
  if (activeSection === 'orders') {
    return (
      <div className="space-y-4 py-5">
        <Toaster position="top-center" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedOrderSugId('')
              setActiveSection(null)
            }}
            className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compras</p>
            <h1 className="text-base font-extrabold tracking-tight">Pedidos & Envio</h1>
          </div>
        </div>

        {/* Seletor de sugestão */}
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <label className="text-[10px] font-black uppercase tracking-tight text-gray-500 block mb-1">
              Selecione a Lista de Compra
            </label>
            <select
              value={selectedOrderSugId}
              onChange={(e) => setSelectedOrderSugId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border bg-white text-xs font-semibold focus:outline-none focus:border-gray-400"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="">Selecione uma lista aprovada/rascunho...</option>
              {suggestions.filter(s => s.status !== 'cancelled').map(s => {
                const dateStr = new Date(s.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })
                const statusStr = s.status === 'approved' ? 'Aprovada' : (s.status === 'reviewed' ? 'Revisada' : 'Rascunho')
                return (
                  <option key={s.id} value={s.id}>
                    {dateStr} ({statusStr}) - por {s.creator_name || 'Admin'}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Seletor Vazio */}
        {!selectedOrderSugId && (
          <div className="text-center py-16 bg-white rounded-xl border p-6 text-gray-400 text-xs font-bold shadow-sm" style={{ borderColor: 'var(--border)' }}>
            Selecione uma lista de compra para ver os pedidos divididos por fornecedor.
          </div>
        )}

        {/* Visualização de Pedidos por Fornecedor */}
        {selectedOrderSugId && (
          <div className="space-y-4">
            {loadingOrderDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : orderItemsBySupplier.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border p-6 text-gray-400 text-xs font-bold shadow-sm" style={{ borderColor: 'var(--border)' }}>
                Nenhum item com quantidade de compra positiva cadastrado para esta lista.
              </div>
            ) : (
              orderItemsBySupplier.map(sup => (
                <div
                  key={sup.name}
                  className="p-4 rounded-xl border bg-white shadow-sm space-y-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase text-gray-800">{sup.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                        {sup.items.length} itens no pedido
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopyOrderText(sup.name, sup.items)}
                      className="p-2 rounded-lg border text-gray-600 hover:text-red-800 hover:bg-red-50 hover:border-red-100 transition cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </button>
                  </div>

                  {/* Listagem de itens formatada para visualização do usuário */}
                  <div className="bg-gray-50 rounded-xl p-3 border space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                    {sup.items.map(it => {
                      const factor = it.conversion_factor || 1
                      const displayQty = it.purchase_unit && factor > 1 
                        ? `${it.adjusted_qty / factor} ${it.purchase_unit} (fator ${factor} ${it.item_unit})`
                        : `${it.adjusted_qty} ${it.item_unit}`
                      return (
                        <div key={it.id} className="text-xs font-semibold text-gray-600 flex justify-between gap-2">
                          <span className="truncate">{it.item_name}</span>
                          <span className="shrink-0 font-extrabold text-gray-850">{displayQty}</span>
                        </div>
                      )
                    })}
                  </div>

                  {sup.whatsapp && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <a
                        href={`https://wa.me/${sup.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Pedido +1 Bar\n\nFornecedor: ${sup.name}\n\n` + sup.items.map(it => {
                          const factor = it.conversion_factor || 1
                          return it.purchase_unit && factor > 1 
                            ? `- ${it.item_name}: ${it.adjusted_qty / factor} ${it.purchase_unit}`
                            : `- ${it.item_name}: ${it.adjusted_qty} ${it.item_unit}`
                        }).join('\n'))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-green-700 hover:underline flex items-center gap-0.5"
                      >
                        Enviar p/ WhatsApp ({sup.whatsapp})
                        <ExternalLink className="w-3 h-3 text-green-500" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}
