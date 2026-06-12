import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { recalcularTotaisOrcamento } from '@/lib/orcamento'
import { Botao } from '@/componentes/ui/Botao'
import { Card, TituloCard } from '@/componentes/ui/Card'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { ModalItemOrcamento } from '@/funcionalidades/admin/modais/ModalItemOrcamento'
import type { OrcamentoItem, OrcamentoStatus } from '@/tipos/database'

type ItemComMateriais = OrcamentoItem & {
  OrcamentoItemFilamento?: { tipo: string; cor: string | null; pesoG: number }[]
  OrcamentoItemMaterial?: { tipo: string | null; quantidade: number }[]
}

export function PaginaDetalheOrcamento() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [novoStatusId, setNovoStatusId] = useState('')
  const [erro, setErro] = useState('')
  const [modalItem, setModalItem] = useState(false)

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
        .select('*, OrcamentoItemFilamento(*), OrcamentoItemMaterial(*)')
        .eq('orcamentoId', id)
        .order('ordem')
      return (data ?? []) as ItemComMateriais[]
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

  const alterarStatus = useMutation({
    mutationFn: async () => {
      if (!supabase || !id || !novoStatusId) throw new Error('Selecione um status')
      const atual = orcamento.data?.statusOrcamentoId
      if (atual === novoStatusId) throw new Error('Status já é o atual')
      const { error } = await supabase.from('Orcamento').update({ statusOrcamentoId: novoStatusId }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setErro('')
      qc.invalidateQueries({ queryKey: ['orcamento', id] })
      qc.invalidateQueries({ queryKey: ['orcamento-historico', id] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao alterar status'),
  })

  const excluirItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (orcamento.data?.travado) throw new Error('Orçamento travado — não é possível excluir itens')
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

  const excluirOrcamento = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Orçamento inválido')
      if (orcamento.data?.travado) throw new Error('Orçamento travado — não é possível excluir')

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

  const o = orcamento.data
  if (orcamento.isLoading) return <p className="text-[var(--texto-muted)]">Carregando...</p>
  if (!o) return <p className="text-erro">Orçamento não encontrado.</p>

  const travado = o.travado
  const listaItens = itens.data ?? []

  return (
    <div className="space-y-6">
      <Link to="/admin/orcamentos" className="inline-flex items-center gap-1 text-sm text-secondary-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar aos orçamentos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--texto)]">Orçamento #{o.numeroSequencial}</h2>
          <p className="text-[var(--texto-secundario)]">{o.Cliente?.nome}</p>
          {travado && (
            <p className="mt-1 flex items-center gap-1 text-sm text-alerta">
              <Lock className="h-4 w-4" /> Travado — itens não podem ser alterados
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
            {formatarMoeda(Number(o.precoTotal))}
          </p>
          <span className="rounded-full bg-secondary-500/15 px-3 py-1 text-sm text-secondary-700 dark:text-secondary-300">
            {o.OrcamentoStatus?.nome}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <TituloCard>Alterar status</TituloCard>
          <div className="space-y-3">
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
            {erro && <p className="text-sm text-erro">{erro}</p>}
            <Botao onClick={() => alterarStatus.mutate()} disabled={alterarStatus.isPending}>
              {alterarStatus.isPending ? 'Salvando...' : 'Atualizar status'}
            </Botao>
          </div>
        </Card>

        <Card>
          <TituloCard>Histórico de status</TituloCard>
          <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
            {historico.data?.length === 0 && (
              <li className="text-[var(--texto-muted)]">Sem histórico ainda.</li>
            )}
            {historico.data?.map((h) => (
              <li key={h.id} className="border-b border-[var(--borda)] pb-2 last:border-0">
                <p className="font-medium text-[var(--texto)]">
                  {h.statusAnterior?.nome ?? '—'} → {h.statusNovo?.nome ?? '—'}
                </p>
                <p className="text-xs text-[var(--texto-muted)]">
                  {new Date(h.alteradoEm).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <TituloCard>Itens do orçamento</TituloCard>
          {!travado && (
            <Botao onClick={() => setModalItem(true)}>Adicionar item</Botao>
          )}
        </div>

        <TabelaDados
          colunas={[
            { id: 'nomePeca', rotulo: 'Peça' },
            { id: 'quantidade', rotulo: 'Qtd' },
            { id: 'pesoTotalG', rotulo: 'Peso (g)', render: (i) => String(i.pesoTotalG) },
            { id: 'custoMaterial', rotulo: 'Custo mat.', render: (i) => formatarMoeda(Number(i.custoMaterial)) },
            { id: 'precoUnitario', rotulo: 'Preço unit.', render: (i) => formatarMoeda(Number(i.precoUnitario)) },
            { id: 'precoTotal', rotulo: 'Preço total', render: (i) => formatarMoeda(Number(i.precoTotal)) },
            {
              id: 'acoes',
              rotulo: '',
              render: (i) =>
                !travado ? (
                  <button
                    type="button"
                    onClick={() => excluirItem.mutate(i.id)}
                    className="text-erro hover:opacity-80"
                    aria-label="Excluir item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null,
            },
          ]}
          dados={listaItens}
          chave={(i) => i.id}
          vazio="Nenhum item neste orçamento."
        />

        {listaItens.length > 0 && (
          <p className="mt-3 text-right text-lg font-bold text-secondary-600">
            Total: {formatarMoeda(Number(o.precoTotal))}
          </p>
        )}

        {!travado && listaItens.length === 0 && (
          <div className="mt-4 flex justify-end">
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
      </div>

      {id && (
        <ModalItemOrcamento
          aberto={modalItem}
          orcamentoId={id}
          ordemInicial={listaItens.length}
          impressoraIdInicial={o.configuracaoImpressoraId}
          onFechar={() => setModalItem(false)}
          onSalvo={() => {
            qc.invalidateQueries({ queryKey: ['orcamento', id] })
            qc.invalidateQueries({ queryKey: ['orcamento-itens', id] })
            qc.invalidateQueries({ queryKey: ['orcamentos'] })
          }}
        />
      )}
    </div>
  )
}
