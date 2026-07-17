import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, ChevronDown, ChevronRight, Copy, Handshake, History, Lock, Pencil, Phone, Receipt, Trash2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import {
  mensagemConfirmacaoReversaoEstoque,
  orcamentoTemMovimentacaoEstoque,
  precisaConfirmarReversaoEstoque,
  reverterEstoqueOrcamento,
} from '@/lib/estoque'
import {
  buscarTitulosDoOrcamento,
  corStatusTitulo,
  estornarBaixaTitulo,
  excluirTituloFinanceiro,
  rotuloStatusTitulo,
} from '@/lib/financeiro'
import { consignarOrcamento, reverterConsignacaoOrcamento } from '@/lib/consignacao'
import { recalcularTotaisOrcamento } from '@/lib/orcamento'
import { Botao } from '@/componentes/ui/Botao'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { CampoSelect } from '@/componentes/ui/CampoSelect'
import { Card } from '@/componentes/ui/Card'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { ModalCalculadora } from '@/funcionalidades/admin/modais/ModalCalculadora'
import { ModalDuplicarOrcamento } from '@/funcionalidades/admin/modais/ModalDuplicarOrcamento'
import { ModalFaturarOrcamento } from '@/funcionalidades/admin/modais/ModalFaturarOrcamento'
import { ModalSalvarModelo } from '@/funcionalidades/admin/modais/ModalSalvarModelo'
import { usePesquisa } from '@/hooks/usePesquisa'
import { modeloDeItemOrcamento, itemTemModeloCorrespondente, listarModelosPeca, salvarModeloDePeca } from '@/lib/itemOrcamentoModelo'
import type { OrcamentoItemComComposicao } from '@/lib/orcamento'
import type { OrcamentoItem, OrcamentoStatus } from '@/tipos/database'

type ItemComComposicao = OrcamentoItem & OrcamentoItemComComposicao

type OrdenacaoItens = 'ordem' | 'nome_asc' | 'nome_desc' | 'preco_asc' | 'preco_desc'

function precoItem(item: ItemComComposicao): number {
  return Number(item.precoFinal ?? item.precoTotal) || 0
}

export function PaginaDetalheOrcamento() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [novoStatusId, setNovoStatusId] = useState('')
  const [erro, setErro] = useState('')
  const [ordenacaoItens, setOrdenacaoItens] = useState<OrdenacaoItens>('ordem')
  const [modalItem, setModalItem] = useState<{
    aberto: boolean
    tipo: 'peca' | 'avulso'
    item: ItemComComposicao | null
  }>({ aberto: false, tipo: 'peca', item: null })
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [modalHistorico, setModalHistorico] = useState(false)
  const [modalStatus, setModalStatus] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [novoClienteId, setNovoClienteId] = useState('')
  const [erroCliente, setErroCliente] = useState('')
  const [modalFaturar, setModalFaturar] = useState(false)
  const [modalDuplicar, setModalDuplicar] = useState(false)
  const [modalLiberarFaturamento, setModalLiberarFaturamento] = useState(false)
  const [motivoLiberacao, setMotivoLiberacao] = useState('')
  const [erroLiberacao, setErroLiberacao] = useState('')
  const [perguntarFaturarAposStatus, setPerguntarFaturarAposStatus] = useState(false)
  const [erroConsignar, setErroConsignar] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [erroPrazoEntrega, setErroPrazoEntrega] = useState('')
  const [prazoSincronizadoDe, setPrazoSincronizadoDe] = useState<string | null>(null)
  const [itemSalvarModelo, setItemSalvarModelo] = useState<ItemComComposicao | null>(null)
  const [erroSalvarModelo, setErroSalvarModelo] = useState('')
  const [itensSalvosComoModelo, setItensSalvosComoModelo] = useState<Set<string>>(new Set())

  const abrirModal = (tipo: 'peca' | 'avulso', item: ItemComComposicao | null = null) => {
    setModalItem({ aberto: true, tipo, item })
  }

  const abrirItem = (item: ItemComComposicao) => {
    abrirModal((item.tipoItem ?? 'peca') === 'avulso' ? 'avulso' : 'peca', item)
  }

  const toggleExpandido = (itemId: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const invalidarItens = () => {
    if (!id) return
    qc.invalidateQueries({ queryKey: ['orcamento', id] })
    qc.invalidateQueries({ queryKey: ['orcamento-itens', id] })
    qc.invalidateQueries({ queryKey: ['orcamentos'] })
  }

  const orcamento = useQuery({
    queryKey: ['orcamento', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return null
      const { data, error } = await supabase
        .from('Orcamento')
        .select('*, Cliente(nome, telefone, email), OrcamentoStatus(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as import('@/tipos/database').Orcamento & {
        Cliente?: { nome: string; telefone: string | null; email: string | null }
        OrcamentoStatus?: OrcamentoStatus
        travado: boolean
      }
    },
  })

  const itens = useQuery({
    queryKey: ['orcamento-itens', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return []
      const { data } = await supabase
        .from('OrcamentoItem')
        .select('*, OrcamentoItemComposicao(*)')
        .eq('orcamentoId', id)
        .order('ordem')
      return (data ?? []) as ItemComComposicao[]
    },
  })

  const modelosPeca = useQuery({
    queryKey: ['modelos-peca'],
    queryFn: async () => {
      if (!supabase) return []
      return listarModelosPeca(supabase)
    },
  })

  const historico = useQuery({
    queryKey: ['orcamento-historico', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return []
      const { data } = await supabase
        .from('OrcamentoHistoricoStatus')
        .select('*, statusAnterior:OrcamentoStatus!statusAnteriorId(nome), statusNovo:OrcamentoStatus!statusNovoId(nome)')
        .eq('orcamentoId', id)
        .order('alteradoEm', { ascending: false })
      return (data ?? []) as {
        id: string
        alteradoEm: string
        observacoes: string | null
        statusAnterior?: { nome: string } | null
        statusNovo?: { nome: string }
      }[]
    },
  })

  const statusLista = useQuery({
    queryKey: ['status-orcamento'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('OrcamentoStatus').select('*').eq('ativo', true).order('ordem')
      return (data ?? []) as OrcamentoStatus[]
    },
  })

  const clientes = useQuery({
    queryKey: ['clientes'],
    enabled: modalCliente,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Cliente').select('id, nome').eq('ativo', true).order('nome')
      return (data ?? []) as { id: string; nome: string }[]
    },
  })

  const titulosFinanceiros = useQuery({
    queryKey: ['titulos-financeiro-orcamento', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return []
      return buscarTitulosDoOrcamento(supabase, id)
    },
  })

  const tituloReceita = titulosFinanceiros.data?.find((t) => t.tipo === 'receita') ?? null
  const titulosDespesa = (titulosFinanceiros.data ?? []).filter((t) => t.tipo === 'despesa')

  const movimentacoesEstoque = useQuery({
    queryKey: ['orcamento-mov-estoque', id],
    enabled: Boolean(id) && modalStatus,
    queryFn: async () => {
      if (!supabase || !id) return false
      return orcamentoTemMovimentacaoEstoque(supabase, id)
    },
  })

  const liberarFaturamento = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Dados inválidos')
      const titulos = titulosFinanceiros.data ?? []
      if (titulos.length === 0) throw new Error('Título financeiro não encontrado')

      for (const titulo of titulos) {
        const { data: baixas } = await supabase
          .from('FinanceiroBaixa')
          .select('id')
          .eq('tituloId', titulo.id)
        for (const b of baixas ?? []) {
          await estornarBaixaTitulo(supabase, b.id, motivoLiberacao || undefined)
        }
        await excluirTituloFinanceiro(supabase, titulo.id, motivoLiberacao || undefined)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['titulos-financeiro-orcamento', id] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      setModalLiberarFaturamento(false)
      setMotivoLiberacao('')
      setErroLiberacao('')
    },
    onError: (e) => setErroLiberacao(e instanceof Error ? e.message : 'Erro ao liberar faturamento'),
  })

  const consignar = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (!confirm('Consignar este orçamento? As peças vão para a consignação do cliente e o estoque será baixado.')) {
        return null
      }
      return consignarOrcamento(supabase, { orcamentoId: id })
    },
    onSuccess: (consId) => {
      setErroConsignar('')
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      if (consId) navigate(`/admin/consignacoes/${consId}`)
    },
    onError: (e) => setErroConsignar(e instanceof Error ? e.message : 'Erro ao consignar'),
  })

  const reverterConsignacao = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (!confirm('Reverter a consignação deste orçamento? As peças saem da consignação e o estoque é estornado.')) {
        return
      }
      await reverterConsignacaoOrcamento(supabase, id)
    },
    onSuccess: () => {
      setErroConsignar('')
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
    },
    onError: (e) => setErroConsignar(e instanceof Error ? e.message : 'Erro ao reverter consignação'),
  })

  const alterarStatus = useMutation({
    mutationFn: async (opts?: { reverterEstoque?: boolean }) => {
      if (!supabase || !id || !novoStatusId) throw new Error('Selecione um status')
      const atual = orcamento.data?.statusOrcamentoId
      if (atual === novoStatusId) throw new Error('Status já é o atual')

      const statusAtual = statusLista.data?.find((s) => s.id === atual)
      const statusNovo = statusLista.data?.find((s) => s.id === novoStatusId)
      if (!statusAtual || !statusNovo) throw new Error('Status inválido')

      const temMov = await orcamentoTemMovimentacaoEstoque(supabase, id)
      const precisaReverter = precisaConfirmarReversaoEstoque(statusAtual, statusNovo, temMov)

      if (precisaReverter && !opts?.reverterEstoque) {
        throw new Error('Confirme a reversão do estoque antes de continuar.')
      }

      if (precisaReverter && opts?.reverterEstoque) {
        await reverterEstoqueOrcamento(supabase, id)
      }

      const { error } = await supabase.from('Orcamento').update({ statusOrcamentoId: novoStatusId }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setErro('')
      setModalStatus(false)
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamento-historico', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['orcamento-mov-estoque', id] })
      // se foi para finalizado e não está faturado, perguntar se quer faturar
      const statusNovo = statusLista.data?.find((s) => s.id === novoStatusId)
      if (statusNovo?.codigo === 'finalizado' && !orcamento.data?.faturado) {
        setPerguntarFaturarAposStatus(true)
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Erro ao alterar status'
      if (msg.includes('Estoque disponível insuficiente')) {
        setErro('Estoque disponível insuficiente para reservar os materiais deste orçamento.')
        return
      }
      setErro(msg)
    },
  })

  const alterarCliente = useMutation({
    mutationFn: async () => {
      if (!supabase || !id || !novoClienteId) throw new Error('Selecione um cliente')
      if (novoClienteId === orcamento.data?.clienteId) throw new Error('Cliente já é o atual')
      const { error } = await supabase.from('Orcamento').update({ clienteId: novoClienteId }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setErroCliente('')
      setModalCliente(false)
      setNovoClienteId('')
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
    },
    onError: (e) => setErroCliente(e instanceof Error ? e.message : 'Erro ao alterar cliente'),
  })

  const chavePrazoServidor = orcamento.data
    ? `${orcamento.data.id}:${orcamento.data.prazoEntrega ?? ''}`
    : null
  if (chavePrazoServidor !== null && chavePrazoServidor !== prazoSincronizadoDe) {
    setPrazoSincronizadoDe(chavePrazoServidor)
    setPrazoEntrega(orcamento.data!.prazoEntrega ?? '')
    setErroPrazoEntrega('')
  }

  const salvarPrazoEntrega = useMutation({
    mutationFn: async (valor: string) => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      const { error } = await supabase
        .from('Orcamento')
        .update({ prazoEntrega: valor || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setErroPrazoEntrega('')
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
    },
    onError: (e) => setErroPrazoEntrega(e instanceof Error ? e.message : 'Erro ao salvar previsão'),
  })

  const excluirItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (orcamento.data?.travado || orcamento.data?.faturado) throw new Error('Orçamento travado/faturado — não é possível excluir itens')
      if (!confirm('Excluir este item do orçamento?')) return
      const { error } = await supabase.from('OrcamentoItem').delete().eq('id', itemId)
      if (error) throw error
      await recalcularTotaisOrcamento(supabase, id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamento-itens', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const salvarItemComoModelo = useMutation({
    mutationFn: async (nome: string) => {
      if (!supabase || !itemSalvarModelo) throw new Error('Item inválido')
      const input = modeloDeItemOrcamento(nome, itemSalvarModelo, orcamento.data?.configuracaoImpressoraId)
      await salvarModeloDePeca(supabase, input)
    },
    onSuccess: () => {
      if (itemSalvarModelo) {
        setItensSalvosComoModelo((prev) => new Set(prev).add(itemSalvarModelo.id))
      }
      qc.invalidateQueries({ queryKey: ['modelos-peca'] })
      setItemSalvarModelo(null)
      setErroSalvarModelo('')
    },
    onError: (e) => setErroSalvarModelo(e instanceof Error ? e.message : 'Erro ao salvar modelo'),
  })

  const excluirOrcamento = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (orcamento.data?.travado || orcamento.data?.faturado) throw new Error('Orçamento travado/faturado — não é possível excluir')

      const { count: qtdItens, error: errItens } = await supabase
        .from('OrcamentoItem')
        .select('id', { count: 'exact', head: true })
        .eq('orcamentoId', id)
      if (errItens) throw errItens
      if (qtdItens && qtdItens > 0) {
        throw new Error('Exclua todos os itens do orçamento antes de excluí-lo.')
      }

      const { count: qtdMov, error: errMov } = await supabase
        .from('EstoqueMovimentacao')
        .select('id', { count: 'exact', head: true })
        .eq('orcamentoId', id)
      if (errMov) throw errMov
      if (qtdMov && qtdMov > 0) {
        throw new Error(
          'Não é possível excluir: existem movimentações de estoque vinculadas a este orçamento.',
        )
      }

      const num = orcamento.data?.numeroSequencial
      if (!confirm(`Excluir orçamento #${num}? Esta ação não pode ser desfeita.`)) return

      const { error } = await supabase.from('Orcamento').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      navigate('/admin/orcamentos')
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir orçamento'),
  })

  const listaItens = itens.data ?? []

  const extrairTextoItem = useCallback((item: ItemComComposicao) => {
    const isAvulso = (item.tipoItem ?? 'peca') === 'avulso'
    const composicao = item.OrcamentoItemComposicao ?? []
    const partesComposicao = composicao.flatMap((c) => [
      c.descricao ?? '',
      c.tipo ?? '',
      c.cor ?? '',
      c.categoria ?? '',
    ])
    return [
      item.nomePeca,
      item.observacoes ?? '',
      isAvulso ? 'Material' : 'Peça',
      ...partesComposicao,
    ].join(' ')
  }, [])

  const { termo, setTermo, filtrados } = usePesquisa(listaItens, extrairTextoItem, 200)

  const itensExibidos = useMemo(() => {
    const copia = [...filtrados]
    copia.sort((a, b) => {
      switch (ordenacaoItens) {
        case 'nome_asc':
          return a.nomePeca.localeCompare(b.nomePeca, 'pt-BR', { numeric: true })
        case 'nome_desc':
          return b.nomePeca.localeCompare(a.nomePeca, 'pt-BR', { numeric: true })
        case 'preco_asc':
          return precoItem(a) - precoItem(b)
        case 'preco_desc':
          return precoItem(b) - precoItem(a)
        case 'ordem':
        default:
          return (a.ordem ?? 0) - (b.ordem ?? 0)
      }
    })
    return copia
  }, [filtrados, ordenacaoItens])

  const o = orcamento.data
  if (orcamento.isLoading) return <p className="text-[var(--texto-muted)]">Carregando...</p>
  if (!o) return <p className="text-erro">Orçamento não encontrado.</p>

  const travado = o.travado
  const faturado = o.faturado ?? false
  const consignado = o.consignado ?? false
  const bloqueado = travado || faturado || consignado
  const podeConsignar =
    !faturado &&
    !consignado &&
    ['em_producao', 'finalizado', 'entregue'].includes(o.OrcamentoStatus?.codigo ?? '')
  const totalItens = listaItens.reduce(
    (s, item) => s + (Number(item.precoFinal ?? item.precoTotal) || 0),
    0,
  )
  const totalOrcamento = Number(o.precoTotal)
  const valorTotal = Number.isFinite(totalOrcamento) ? totalOrcamento : totalItens
  const filtroAtivo = termo.trim().length > 0
  const statusCor = o.OrcamentoStatus?.cor
  const statusNovoSelecionado = statusLista.data?.find((s) => s.id === (novoStatusId || o.statusOrcamentoId))
  const statusAtualObj = statusLista.data?.find((s) => s.id === o.statusOrcamentoId)
  const avisoReversaoEstoque = Boolean(
    statusAtualObj &&
    statusNovoSelecionado &&
    statusNovoSelecionado.id !== o.statusOrcamentoId &&
    movimentacoesEstoque.data &&
    precisaConfirmarReversaoEstoque(statusAtualObj, statusNovoSelecionado, true),
  )

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1)
          else navigate('/admin/orcamentos')
        }}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <Card className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
                Orçamento #{o.numeroSequencial}
              </p>
              {o.Cliente?.nome && (
                <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--texto)]">
                  <User className="h-5 w-5 shrink-0 text-[var(--texto-muted)]" />
                  {o.Cliente.nome}
                  {!faturado && (
                    <button
                      type="button"
                      onClick={() => { setErroCliente(''); setNovoClienteId(o.clienteId); setModalCliente(true) }}
                      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-[var(--texto-muted)] hover:bg-[var(--superficie-elevada)] hover:text-[var(--texto)]"
                      aria-label="Alterar cliente"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </p>
              )}
              {o.Cliente?.telefone && (
                <p className="mt-1 flex items-center gap-2 text-sm text-[var(--texto-secundario)]">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--texto-muted)]" />
                  {o.Cliente.telefone}
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <p className="text-sm text-[var(--texto-muted)]">
                  Lançamento:{' '}
                  <span className="text-[var(--texto-secundario)]">
                    {new Date(o.criadoEm).toLocaleDateString('pt-BR')}
                  </span>
                </p>
                <div className="sm:max-w-xs">
                  <Input
                    rotulo="Previsão de entrega"
                    type="date"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    onBlur={() => {
                      const atual = o.prazoEntrega ?? ''
                      if (prazoEntrega === atual || salvarPrazoEntrega.isPending) return
                      salvarPrazoEntrega.mutate(prazoEntrega)
                    }}
                    disabled={faturado || salvarPrazoEntrega.isPending}
                    erro={erroPrazoEntrega}
                  />
                </div>
              </div>
            </div>
            {travado && !faturado && !consignado && (
              <p className="flex items-center gap-1.5 text-sm text-alerta">
                <Lock className="h-4 w-4" /> Travado — itens não podem ser alterados
              </p>
            )}
            {faturado && (
              <p className="flex items-center gap-1.5 text-sm text-sucesso">
                <Receipt className="h-4 w-4" /> Faturado — itens e valores bloqueados
              </p>
            )}
            {consignado && (
              <p className="flex items-center gap-1.5 text-sm text-secondary-600">
                <Handshake className="h-4 w-4" /> Consignado — itens bloqueados; controle na consignação
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="w-full rounded-xl bg-sucesso/10 px-5 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-sucesso/80">Valor total</p>
              <p className="text-3xl font-bold tabular-nums text-sucesso">
                {formatarMoeda(valorTotal)}
              </p>
            </div>
            <span
              className={
                statusCor
                  ? 'rounded-full px-3 py-1 text-sm font-medium'
                  : 'rounded-full bg-secondary-500/15 px-3 py-1 text-sm font-medium text-secondary-700 dark:text-secondary-300'
              }
              style={statusCor ? { backgroundColor: `${statusCor}22`, color: statusCor } : undefined}
            >
              {o.OrcamentoStatus?.nome}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--borda)] bg-[var(--fundo)]/50 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 sm:py-2.5">
          <button
            type="button"
            onClick={() => setModalHistorico(true)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)]"
          >
            <History className="h-3.5 w-3.5" />
            Histórico de status
            {historico.data && historico.data.length > 0 && (
              <span className="rounded-full bg-[var(--superficie-elevada)] px-1.5 text-xs">
                {historico.data.length}
              </span>
            )}
          </button>

          {!consignado && (
            <button
              type="button"
              onClick={() => setModalStatus(true)}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)]"
            >
              Alterar status
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalDuplicar(true)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)]"
          >
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </button>

          {!faturado && !consignado && travado && (
            <button
              type="button"
              onClick={() => setModalFaturar(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sucesso transition hover:text-sucesso/80"
            >
              <Receipt className="h-3.5 w-3.5" /> Faturar
            </button>
          )}

          {podeConsignar && (
            <button
              type="button"
              onClick={() => consignar.mutate()}
              disabled={consignar.isPending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-600 transition hover:text-secondary-500 disabled:opacity-50"
            >
              <Handshake className="h-3.5 w-3.5" /> {consignar.isPending ? 'Consignando...' : 'Consignar'}
            </button>
          )}

          {faturado && (
            <button
              type="button"
              onClick={() => { setErroLiberacao(''); setMotivoLiberacao(''); setModalLiberarFaturamento(true) }}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-erro"
            >
              Remover faturamento
            </button>
          )}

          {consignado && (
            <>
              {o.consignacaoId && (
                <Link
                  to={`/admin/consignacoes/${o.consignacaoId}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-600 transition hover:text-secondary-500"
                >
                  <Handshake className="h-3.5 w-3.5" /> Ver consignação
                </Link>
              )}
              <button
                type="button"
                onClick={() => reverterConsignacao.mutate()}
                disabled={reverterConsignacao.isPending}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-erro disabled:opacity-50"
              >
                Reverter consignação
              </button>
            </>
          )}
        </div>

        {erroConsignar && (
          <p className="px-5 pt-1 text-sm text-erro">{erroConsignar}</p>
        )}

        {/* Card financeiro */}
        {(tituloReceita || titulosDespesa.length > 0) && (
          <div className="space-y-2 border-t border-[var(--borda)] bg-[var(--fundo)]/50 px-5 py-2.5">
            {tituloReceita && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--texto-muted)]" />
                <span className="text-sm text-[var(--texto-muted)]">
                  Contas a receber:{' '}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${corStatusTitulo(tituloReceita.status)}22`,
                      color: corStatusTitulo(tituloReceita.status),
                    }}
                  >
                    {rotuloStatusTitulo(tituloReceita.status)}
                  </span>
                  {' '}·{' '}
                  <strong>{formatarMoeda(tituloReceita.valor)}</strong>
                  {' '}·{' '}
                  vence{' '}
                  {new Date(tituloReceita.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {titulosDespesa.map((titulo) => (
              <div key={titulo.id} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--texto-muted)]" />
                <span className="text-sm text-[var(--texto-muted)]">
                  Contas a pagar
                  {titulo.FinanceiroPlanoConta?.nome
                    ? ` (${titulo.FinanceiroPlanoConta.nome})`
                    : ' (frete)'}
                  :{' '}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${corStatusTitulo(titulo.status)}22`,
                      color: corStatusTitulo(titulo.status),
                    }}
                  >
                    {rotuloStatusTitulo(titulo.status)}
                  </span>
                  {' '}·{' '}
                  <strong>{formatarMoeda(titulo.valor)}</strong>
                  {' '}·{' '}
                  vence{' '}
                  {new Date(titulo.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-[var(--borda)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
              Itens do orçamento
            </h3>
            {listaItens.length > 0 && (
              <p className="mt-0.5 text-xs text-[var(--texto-muted)]">
                {filtroAtivo
                  ? `${itensExibidos.length} de ${listaItens.length} ${listaItens.length === 1 ? 'item' : 'itens'}`
                  : `${listaItens.length} ${listaItens.length === 1 ? 'item' : 'itens'}`}
              </p>
            )}
          </div>
          {!bloqueado && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Botao className="w-full sm:w-auto" onClick={() => abrirModal('peca')}>Adicionar peça</Botao>
              <Botao className="w-full sm:w-auto" variante="fantasma" onClick={() => abrirModal('avulso')}>Adicionar material</Botao>
              <Link
                to="/admin/orcamentos/modelos"
                className="text-center text-sm text-secondary-600 hover:underline dark:text-secondary-400 sm:px-2"
              >
                Gerenciar modelos
              </Link>
            </div>
          )}
        </div>

        {listaItens.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-[var(--borda)] px-5 py-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <span className="text-[var(--texto-secundario)]">Filtrar itens</span>
              <CampoPesquisa
                valor={termo}
                onChange={setTermo}
                placeholder="Filtrar itens..."
                className="w-full max-w-none"
              />
            </label>
            <CampoSelect
              rotulo="Ordenar"
              value={ordenacaoItens}
              onChange={(e) => setOrdenacaoItens(e.target.value as OrdenacaoItens)}
              className="sm:min-w-[180px]"
            >
              <option value="ordem">Ordem original</option>
              <option value="nome_asc">Nome A–Z</option>
              <option value="nome_desc">Nome Z–A</option>
              <option value="preco_asc">Preço menor → maior</option>
              <option value="preco_desc">Preço maior → menor</option>
            </CampoSelect>
          </div>
        )}

        <div className="px-2 pb-2 sm:px-0">
          {listaItens.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--texto-muted)]">Nenhum item neste orçamento.</p>
          ) : itensExibidos.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--texto-muted)]">Nenhum item encontrado.</p>
          ) : (
            <div className="divide-y divide-[var(--borda)]">
              {itensExibidos.map((item) => {
                const isAvulso = (item.tipoItem ?? 'peca') === 'avulso'
                const composicao = [...(item.OrcamentoItemComposicao ?? [])].sort((a, b) => a.ordem - b.ordem)
                const subItens = isAvulso
                  ? []
                  : composicao.map((c) => ({
                      nome: c.descricao ?? c.tipo ?? c.categoria,
                      detalhe: `${c.quantidade} ${c.unidadeMedida}`,
                    }))
                const expandido = expandidos.has(item.id)
                const temModeloSalvo =
                  itensSalvosComoModelo.has(item.id) ||
                  itemTemModeloCorrespondente(item, modelosPeca.data ?? [])

                return (
                  <div key={item.id}>
                    <div
                      className={`flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-[var(--fundo)]/50 sm:px-5 ${!bloqueado ? '' : 'cursor-default'}`}
                      onClick={() => !bloqueado && abrirItem(item)}
                      onKeyDown={() => {}}
                      role="button"
                      tabIndex={0}
                    >
                      {!isAvulso && subItens.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpandido(item.id) }}
                          className="text-[var(--texto-muted)]"
                        >
                          {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--texto)]">{item.nomePeca}</span>
                          <span className="rounded-full bg-[var(--superficie-elevada)] px-2 py-0.5 text-xs text-[var(--texto-muted)]">
                            {isAvulso ? 'Material' : 'Peça'}
                          </span>
                          {item.ehFrete && (
                            <span className="rounded-full bg-alerta/15 px-2 py-0.5 text-xs font-medium text-alerta">
                              Frete
                            </span>
                          )}
                        </div>
                        {!isAvulso && (
                          <p className="text-xs text-[var(--texto-muted)]">
                            Qtd {item.quantidade} · {item.pesoTotalG} gr
                          </p>
                        )}
                      </div>
                      <span className="w-full shrink-0 tabular-nums font-medium text-sucesso sm:ml-auto sm:w-auto">
                        {formatarMoeda(Number(item.precoFinal ?? item.precoTotal))}
                      </span>
                      {!bloqueado && (
                        <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                          {!isAvulso && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setErroSalvarModelo('')
                                setItemSalvarModelo(item)
                              }}
                              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-[var(--superficie-elevada)] ${
                                temModeloSalvo
                                  ? 'text-secondary-500 dark:text-primary-400'
                                  : 'text-[var(--texto-muted)]'
                              }`}
                              aria-label={temModeloSalvo ? 'Modelo salvo' : 'Salvar como modelo'}
                              title={temModeloSalvo ? 'Modelo salvo — clique para salvar outra versão' : 'Salvar como modelo'}
                            >
                              <Bookmark className={`h-4 w-4 ${temModeloSalvo ? 'fill-current' : ''}`} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); abrirItem(item) }}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--texto-muted)] hover:bg-[var(--superficie-elevada)]"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); excluirItem.mutate(item.id) }}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-erro hover:bg-erro/10"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {expandido && subItens.length > 0 && (
                      <div className="border-t border-[var(--borda)] bg-[var(--fundo)]/30 px-5 py-2 pl-14">
                        {subItens.map((sub, idx) => (
                          <div key={idx} className="flex justify-between py-1 text-sm text-[var(--texto-secundario)]">
                            <span>{sub.nome}</span>
                            <span className="text-[var(--texto-muted)]">{sub.detalhe}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {listaItens.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--borda)] bg-sucesso/5 px-5 py-3">
            <span className="text-sm text-[var(--texto-muted)]">Total do orçamento</span>
            <span className="text-xl font-bold tabular-nums text-sucesso">
              {formatarMoeda(valorTotal)}
            </span>
          </div>
        )}

        {!bloqueado && listaItens.length === 0 && (
          <div className="flex justify-end border-t border-[var(--borda)] px-5 py-3">
            <Botao
              variante="fantasma"
              onClick={() => excluirOrcamento.mutate()}
              disabled={excluirOrcamento.isPending}
              className="text-erro hover:text-erro"
            >
              {excluirOrcamento.isPending ? 'Excluindo...' : 'Excluir orçamento'}
            </Botao>
          </div>
        )}
      </Card>

      <Modal
        aberto={modalHistorico}
        onFechar={() => setModalHistorico(false)}
        titulo="Histórico de status"
        largura="md"
      >
        <ul className="space-y-3 text-sm">
          {historico.data?.length === 0 && (
            <li className="text-[var(--texto-muted)]">Sem histórico ainda.</li>
          )}
          {historico.data?.map((h) => (
            <li key={h.id} className="rounded-lg border border-[var(--borda)] px-4 py-3">
              <p className="font-medium text-[var(--texto)]">
                {h.statusAnterior?.nome ?? '—'}
                <span className="mx-1.5 text-[var(--texto-muted)]">→</span>
                {h.statusNovo?.nome ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-muted)]">
                {new Date(h.alteradoEm).toLocaleString('pt-BR')}
              </p>
              {h.observacoes && (
                <p className="mt-1 text-xs text-[var(--texto-secundario)]">{h.observacoes}</p>
              )}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        aberto={modalStatus}
        onFechar={() => { setModalStatus(false); setErro('') }}
        titulo="Alterar status"
        largura="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--texto-muted)]">
            Status atual: <span className="font-medium text-[var(--texto)]">{o.OrcamentoStatus?.nome}</span>
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--texto-secundario)]">Novo status</span>
            <select
              value={novoStatusId || o.statusOrcamentoId}
              onChange={(e) => setNovoStatusId(e.target.value)}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
            >
              {statusLista.data?.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </label>

          {avisoReversaoEstoque && statusAtualObj && statusNovoSelecionado && (
            <div className="rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm text-[var(--texto)]">
              <p className="font-medium text-alerta">Atenção — estoque</p>
              <p className="mt-1 whitespace-pre-line text-[var(--texto-secundario)]">
                {mensagemConfirmacaoReversaoEstoque(statusAtualObj, statusNovoSelecionado)}
              </p>
            </div>
          )}

          {erro && <p className="text-sm text-erro">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="fantasma" onClick={() => { setModalStatus(false); setErro('') }}>
              Cancelar
            </Botao>
            <Botao
              onClick={() => alterarStatus.mutate({ reverterEstoque: avisoReversaoEstoque })}
              disabled={alterarStatus.isPending}
            >
              {alterarStatus.isPending ? 'Salvando...' : avisoReversaoEstoque ? 'Confirmar e alterar' : 'Atualizar status'}
            </Botao>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalCliente}
        onFechar={() => { setModalCliente(false); setErroCliente('') }}
        titulo="Alterar cliente"
        largura="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--texto-muted)]">
            Cliente atual: <span className="font-medium text-[var(--texto)]">{o.Cliente?.nome ?? '—'}</span>
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--texto-secundario)]">Novo cliente</span>
            <select
              value={novoClienteId || o.clienteId}
              onChange={(e) => setNovoClienteId(e.target.value)}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
            >
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          {erroCliente && <p className="text-sm text-erro">{erroCliente}</p>}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="fantasma" onClick={() => { setModalCliente(false); setErroCliente('') }}>
              Cancelar
            </Botao>
            <Botao onClick={() => alterarCliente.mutate()} disabled={alterarCliente.isPending}>
              {alterarCliente.isPending ? 'Salvando...' : 'Salvar'}
            </Botao>
          </div>
        </div>
      </Modal>

      {id && (
        <ModalCalculadora
          aberto={modalItem.aberto}
          onFechar={() => setModalItem({ aberto: false, tipo: 'peca', item: null })}
          onSalvo={invalidarItens}
          orcamentoId={id}
          tipoItem={modalItem.tipo}
          itemEdicao={modalItem.item}
          ordemInicial={listaItens.length}
        />
      )}

      <ModalSalvarModelo
        aberto={Boolean(itemSalvarModelo)}
        nomeSugerido={itemSalvarModelo?.nomePeca ?? ''}
        onFechar={() => { setItemSalvarModelo(null); setErroSalvarModelo('') }}
        onSalvar={(nome) => salvarItemComoModelo.mutate(nome)}
        salvando={salvarItemComoModelo.isPending}
        erro={erroSalvarModelo}
      />

      <ModalFaturarOrcamento
        aberto={modalFaturar}
        orcamentoId={id ?? null}
        numeroSequencial={o.numeroSequencial}
        precoTotal={valorTotal}
        onFechar={() => setModalFaturar(false)}
        onSalvo={() => {
          qc.invalidateQueries({ queryKey: ['orcamento', id] })
          qc.invalidateQueries({ queryKey: ['titulos-financeiro-orcamento', id] })
          qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
          qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
        }}
      />

      <ModalDuplicarOrcamento
        aberto={modalDuplicar}
        orcamentoId={id ?? null}
        clienteAtualId={o.clienteId}
        itens={listaItens.map((i) => ({
          id: i.id,
          nomePeca: i.nomePeca,
          precoFinal: Number(i.precoFinal),
          precoTotal: Number(i.precoTotal),
          tipoItem: i.tipoItem ?? 'peca',
          ehFrete: i.ehFrete ?? false,
        }))}
        onFechar={() => setModalDuplicar(false)}
      />

      {/* Modal: pergunta se quer faturar ao finalizar */}
      <Modal
        aberto={perguntarFaturarAposStatus}
        onFechar={() => setPerguntarFaturarAposStatus(false)}
        titulo="Faturar orçamento?"
        largura="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--texto-secundario)]">
            O orçamento foi finalizado. Deseja gerar o título financeiro agora?
          </p>
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setPerguntarFaturarAposStatus(false)}>
              Não, depois
            </Botao>
            <Botao
              onClick={() => {
                setPerguntarFaturarAposStatus(false)
                setModalFaturar(true)
              }}
            >
              Sim, faturar
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal: liberar faturamento (estornar baixas + excluir título) */}
      <Modal
        aberto={modalLiberarFaturamento}
        onFechar={() => setModalLiberarFaturamento(false)}
        titulo="Remover faturamento"
        largura="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--texto-secundario)]">
            Isso estornará todas as baixas do título e o excluirá permanentemente, liberando a edição do
            orçamento. A operação ficará registrada em log.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--texto-secundario)]">Motivo (opcional)</span>
            <input
              type="text"
              value={motivoLiberacao}
              onChange={(e) => setMotivoLiberacao(e.target.value)}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
              placeholder="Informe o motivo..."
            />
          </label>
          {erroLiberacao && <p className="text-sm text-erro">{erroLiberacao}</p>}
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setModalLiberarFaturamento(false)}>
              Cancelar
            </Botao>
            <Botao
              className="bg-erro text-white hover:bg-erro/90"
              onClick={() => liberarFaturamento.mutate()}
              disabled={liberarFaturamento.isPending}
            >
              {liberarFaturamento.isPending ? 'Removendo...' : 'Confirmar remoção'}
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  )
}
