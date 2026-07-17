import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownUp, ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Circle, Lock, Package, Pencil, RotateCcw, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import {
  atualizarItemConsignacao,
  buscarConsignacao,
  buscarItensConsignacao,
  buscarRecebimentosConsignacao,
  encerrarConsignacao,
  marcarItemVendido,
  reverterConsignacaoOrcamento,
} from '@/lib/consignacao'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { ModalEditarItemConsignacao } from '@/funcionalidades/admin/modais/ModalEditarItemConsignacao'
import { ModalFaturarConsignacao } from '@/funcionalidades/admin/modais/ModalFaturarConsignacao'
import type { ConsignacaoItem } from '@/tipos/database'

type OrdenacaoItens = 'consignado' | 'nome_asc' | 'nome_desc' | 'preco_asc' | 'preco_desc'

const OPCOES_ORDENACAO: { valor: OrdenacaoItens; rotulo: string }[] = [
  { valor: 'consignado', rotulo: 'Ordem de entrega' },
  { valor: 'nome_asc', rotulo: 'Nome (A-Z)' },
  { valor: 'nome_desc', rotulo: 'Nome (Z-A)' },
  { valor: 'preco_desc', rotulo: 'Maior valor' },
  { valor: 'preco_asc', rotulo: 'Menor valor' },
]

type EventoLinha =
  | { tipo: 'entrega'; data: string; chave: string; descricao: string; valor: number; orcamentoId: string | null; numeroSequencial: number | null; qtdPecas: number }
  | { tipo: 'recebimento'; data: string; chave: string; descricao: string; valor: number }

function dataBR(valor: string): string {
  const d = valor.includes('T') ? new Date(valor) : new Date(`${valor}T12:00:00`)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

export function PaginaDetalheConsignacao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modalFaturar, setModalFaturar] = useState(false)
  const [itemEditando, setItemEditando] = useState<ConsignacaoItem | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [ordenacao, setOrdenacao] = useState<OrdenacaoItens>('consignado')
  const [precoLote, setPrecoLote] = useState('')
  const [erro, setErro] = useState('')
  const [timelineAberta, setTimelineAberta] = useState(true)
  const [vendidosAbertos, setVendidosAbertos] = useState(false)

  const consignacao = useQuery({
    queryKey: ['consignacao', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return null
      return buscarConsignacao(supabase, id)
    },
  })

  const itens = useQuery({
    queryKey: ['consignacao-itens', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return []
      return buscarItensConsignacao(supabase, id)
    },
  })

  const recebimentos = useQuery({
    queryKey: ['consignacao-recebimentos', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!supabase || !id) return []
      return buscarRecebimentosConsignacao(supabase, id)
    },
  })

  const alternarVendido = useMutation({
    mutationFn: async (params: { itemId: string; vendido: boolean }) => {
      if (!supabase) throw new Error('Consignação inválida')
      await marcarItemVendido(supabase, params.itemId, params.vendido)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consignacao-itens', id] }),
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao atualizar peça'),
  })

  const encerrar = useMutation({
    mutationFn: async () => {
      if (!supabase || !id) throw new Error('Consignação inválida')
      if (!confirm('Encerrar esta consignação? Ela precisa estar com o saldo quitado.')) return
      await encerrarConsignacao(supabase, id)
    },
    onSuccess: () => {
      setErro('')
      qc.invalidateQueries({ queryKey: ['consignacao', id] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao encerrar'),
  })

  const reverterOS = useMutation({
    mutationFn: async (orcamentoId: string) => {
      if (!supabase) throw new Error('Consignação inválida')
      if (!confirm('Reverter esta OS da consignação? As peças saem da consignação e o estoque é estornado.')) return
      await reverterConsignacaoOrcamento(supabase, orcamentoId)
    },
    onSuccess: () => {
      setErro('')
      qc.invalidateQueries({ queryKey: ['consignacao', id] })
      qc.invalidateQueries({ queryKey: ['consignacao-itens', id] })
      qc.invalidateQueries({ queryKey: ['consignacao-recebimentos', id] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
      qc.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao reverter OS'),
  })

  const alterarPrecoLote = useMutation({
    mutationFn: async (preco: number) => {
      if (!supabase) throw new Error('Consignação inválida')
      if (!Number.isFinite(preco) || preco < 0) throw new Error('Informe um preço válido')
      if (selecionados.size === 0) throw new Error('Selecione ao menos uma peça')
      for (const itemId of selecionados) {
        await atualizarItemConsignacao(supabase, { itemId, precoUnitario: preco })
      }
    },
    onSuccess: () => {
      setErro('')
      setPrecoLote('')
      setSelecionados(new Set())
      qc.invalidateQueries({ queryKey: ['consignacao-itens', id] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao alterar preços'),
  })

  const listaItens = useMemo(() => itens.data ?? [], [itens.data])
  const listaRecebimentos = useMemo(() => recebimentos.data ?? [], [recebimentos.data])

  const itensOrdenados = useMemo(() => {
    const copia = [...listaItens]
    copia.sort((a, b) => {
      switch (ordenacao) {
        case 'nome_asc':
          return a.descricao.localeCompare(b.descricao, 'pt-BR', { numeric: true })
        case 'nome_desc':
          return b.descricao.localeCompare(a.descricao, 'pt-BR', { numeric: true })
        case 'preco_asc':
          return Number(a.valorTotal) - Number(b.valorTotal)
        case 'preco_desc':
          return Number(b.valorTotal) - Number(a.valorTotal)
        case 'consignado':
        default:
          return a.consignadoEm < b.consignadoEm ? -1 : a.consignadoEm > b.consignadoEm ? 1 : 0
      }
    })
    return copia
  }, [listaItens, ordenacao])

  const alternarSelecionado = (itemId: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const todosSelecionados = listaItens.length > 0 && selecionados.size === listaItens.length
  const alternarTodosSelecionados = () => {
    setSelecionados(todosSelecionados ? new Set() : new Set(listaItens.map((i) => i.id)))
  }

  const valorConsignado = listaItens.reduce((s, i) => s + Number(i.valorTotal), 0)
  const totalRecebido = listaRecebimentos.reduce((s, r) => s + Number(r.valor), 0)
  const saldo = valorConsignado - totalRecebido

  const linhaDoTempo = useMemo<EventoLinha[]>(() => {
    const entregasPorOrcamento = new Map<string, EventoLinha & { tipo: 'entrega' }>()
    const eventos: EventoLinha[] = []

    for (const item of listaItens) {
      const chaveGrupo = item.orcamentoId ?? item.id
      const existente = entregasPorOrcamento.get(chaveGrupo)
      if (existente) {
        existente.valor += Number(item.valorTotal)
        existente.qtdPecas += 1
        if (item.consignadoEm < existente.data) existente.data = item.consignadoEm
      } else {
        const evento: EventoLinha & { tipo: 'entrega' } = {
          tipo: 'entrega',
          data: item.consignadoEm,
          chave: `entrega-${chaveGrupo}`,
          descricao: item.Orcamento?.numeroSequencial
            ? `Peças consignadas · OS #${item.Orcamento.numeroSequencial}`
            : 'Peças consignadas',
          valor: Number(item.valorTotal),
          orcamentoId: item.orcamentoId,
          numeroSequencial: item.Orcamento?.numeroSequencial ?? null,
          qtdPecas: 1,
        }
        entregasPorOrcamento.set(chaveGrupo, evento)
        eventos.push(evento)
      }
    }

    for (const r of listaRecebimentos) {
      eventos.push({
        tipo: 'recebimento',
        data: r.dataRecebimento,
        chave: `receb-${r.id}`,
        descricao: r.FinanceiroContaCaixa?.nome
          ? `Recebimento · ${r.FinanceiroContaCaixa.nome}`
          : 'Recebimento',
        valor: Number(r.valor),
      })
    }

    return eventos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  }, [listaItens, listaRecebimentos])

  const c = consignacao.data
  if (consignacao.isLoading) return <p className="text-[var(--texto-muted)]">Carregando...</p>
  if (!c) return <p className="text-erro">Consignação não encontrada.</p>

  const aberta = c.status === 'aberta'
  const pendentes = itensOrdenados.filter((i) => !i.vendido)
  const vendidos = itensOrdenados.filter((i) => i.vendido)

  const renderItem = (item: (typeof itensOrdenados)[number]) => (
    <li
      key={item.id}
      className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        {aberta && (
          <input
            type="checkbox"
            checked={selecionados.has(item.id)}
            onChange={() => alternarSelecionado(item.id)}
            className="mt-1 h-4 w-4 shrink-0"
            aria-label={`Selecionar ${item.descricao}`}
          />
        )}
        <button
          type="button"
          onClick={() => alternarVendido.mutate({ itemId: item.id, vendido: !item.vendido })}
          disabled={!aberta || alternarVendido.isPending}
          className={`mt-0.5 shrink-0 transition disabled:opacity-40 ${
            item.vendido ? 'text-sucesso' : 'text-[var(--texto-muted)] hover:text-[var(--texto)]'
          }`}
          title={item.vendido ? 'Marcar como não vendida' : 'Marcar como vendida'}
        >
          {item.vendido ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--texto)]">{item.descricao}</p>
          <p className="text-xs text-[var(--texto-muted)]">
            {Number(item.quantidade)} un · {formatarMoeda(Number(item.precoUnitario))}/un
            {item.Orcamento?.numeroSequencial && (
              <>
                {' · '}
                <Link
                  to={`/admin/orcamentos/${item.orcamentoId}`}
                  className="inline-flex items-center gap-0.5 text-secondary-600 hover:underline"
                >
                  OS #{item.Orcamento.numeroSequencial}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--superficie-elevada)] px-3 py-2 pl-11 sm:justify-end sm:bg-transparent sm:px-0 sm:py-0 sm:pl-0">
        <span className="text-base font-bold tabular-nums text-[var(--texto)] sm:text-lg">
          {formatarMoeda(Number(item.valorTotal))}
        </span>
        {aberta && (
          <button
            type="button"
            onClick={() => setItemEditando(item)}
            className="rounded-lg p-1 text-[var(--texto-muted)] transition hover:bg-[var(--superficie-elevada)] hover:text-[var(--texto)]"
            title="Editar valor/quantidade"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1)
          else navigate('/admin/consignacoes')
        }}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-[var(--borda)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-[var(--texto-muted)]">Consignação #{c.numeroSequencial}</p>
            <h2 className="truncate text-xl font-bold text-[var(--texto)]">{c.Cliente?.nome ?? '—'}</h2>
            {c.Cliente?.telefone && (
              <p className="text-sm text-[var(--texto-muted)]">{c.Cliente.telefone}</p>
            )}
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                aberta
                  ? 'bg-secondary-500/15 text-secondary-700 dark:text-secondary-300'
                  : 'bg-[var(--superficie-elevada)] text-[var(--texto-muted)]'
              }`}
            >
              {!aberta && <Lock className="h-3 w-3" />}
              {aberta ? 'Aberta' : 'Encerrada'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--texto-muted)]">Saldo a receber</p>
            <p
              className={`text-3xl font-bold tabular-nums ${saldo > 0 ? 'text-alerta' : 'text-sucesso'}`}
            >
              {formatarMoeda(saldo)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[var(--borda)] sm:grid-cols-3">
          <div className="bg-[var(--superficie)] px-5 py-3">
            <p className="text-xs text-[var(--texto-muted)]">Consignado</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--texto)]">{formatarMoeda(valorConsignado)}</p>
          </div>
          <div className="bg-[var(--superficie)] px-5 py-3">
            <p className="text-xs text-[var(--texto-muted)]">Recebido</p>
            <p className="text-lg font-semibold tabular-nums text-sucesso">{formatarMoeda(totalRecebido)}</p>
          </div>
          <div className="bg-[var(--superficie)] px-5 py-3">
            <p className="text-xs text-[var(--texto-muted)]">Peças</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--texto)]">{listaItens.length}</p>
          </div>
        </div>

        {aberta && (
          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--borda)] px-5 py-3">
            <button
              type="button"
              onClick={() => setModalFaturar(true)}
              disabled={saldo <= 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sucesso transition hover:text-sucesso/80 disabled:opacity-40"
            >
              <Wallet className="h-3.5 w-3.5" /> Faturar / receber
            </button>
            <button
              type="button"
              onClick={() => encerrar.mutate()}
              disabled={saldo !== 0 || encerrar.isPending}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-muted)] transition hover:text-[var(--texto)] disabled:opacity-40"
              title={saldo !== 0 ? 'Quite o saldo para encerrar' : undefined}
            >
              <Lock className="h-3.5 w-3.5" /> Encerrar
            </button>
          </div>
        )}

        {erro && <p className="border-t border-[var(--borda)] px-5 py-2 text-sm text-erro">{erro}</p>}
      </Card>

      {/* Linha do tempo */}
      <Card className="p-0">
        <button
          type="button"
          onClick={() => setTimelineAberta((v) => !v)}
          className="flex w-full items-center justify-between gap-3 border-b border-[var(--borda)] px-5 py-4 text-left"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
            Linha do tempo
            {linhaDoTempo.length > 0 && (
              <span className="ml-1.5 text-[var(--texto-muted)]">({linhaDoTempo.length})</span>
            )}
          </h3>
          {timelineAberta ? (
            <ChevronDown className="h-4 w-4 text-[var(--texto-muted)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--texto-muted)]" />
          )}
        </button>
        {timelineAberta && (
          linhaDoTempo.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--texto-muted)]">Nenhum lançamento ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {linhaDoTempo.map((ev) => (
                <li key={ev.chave} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        ev.tipo === 'recebimento' ? 'bg-sucesso/15 text-sucesso' : 'bg-secondary-500/15 text-secondary-600'
                      }`}
                    >
                      {ev.tipo === 'recebimento' ? <Wallet className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--texto)]">{ev.descricao}</p>
                      <p className="text-xs text-[var(--texto-muted)]">
                        {dataBR(ev.data)}
                        {ev.tipo === 'entrega' && ` · ${ev.qtdPecas} ${ev.qtdPecas === 1 ? 'peça' : 'peças'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        ev.tipo === 'recebimento' ? 'text-sucesso' : 'text-[var(--texto)]'
                      }`}
                    >
                      {ev.tipo === 'recebimento' ? '- ' : '+ '}
                      {formatarMoeda(ev.valor)}
                    </span>
                    {aberta && ev.tipo === 'entrega' && ev.orcamentoId && (
                      <button
                        type="button"
                        onClick={() => reverterOS.mutate(ev.orcamentoId!)}
                        disabled={reverterOS.isPending}
                        className="rounded-lg p-1 text-[var(--texto-muted)] transition hover:bg-erro/10 hover:text-erro disabled:opacity-40"
                        title="Reverter esta OS da consignação"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </Card>

      {/* Peças */}
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-[var(--borda)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
            Peças com o cliente
          </h3>
          <div className="flex items-center gap-2">
            {aberta && listaItens.length > 0 && (
              <button
                type="button"
                onClick={alternarTodosSelecionados}
                className="text-xs text-secondary-600 hover:underline"
              >
                {todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs text-[var(--texto-muted)]">
              <ArrowDownUp className="h-3.5 w-3.5" />
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as OrdenacaoItens)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-2 py-1 text-[var(--texto)]"
              >
                {OPCOES_ORDENACAO.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {aberta && selecionados.size > 0 && (
          <div className="flex flex-col gap-2 border-b border-[var(--borda)] bg-secondary-500/5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[var(--texto-secundario)]">
              {selecionados.size} {selecionados.size === 1 ? 'peça selecionada' : 'peças selecionadas'}
            </span>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); alterarPrecoLote.mutate(Number(precoLote)) }}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                value={precoLote}
                onChange={(e) => setPrecoLote(e.target.value)}
                placeholder="Novo preço un."
                className="w-36 rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-1.5 text-sm text-[var(--texto)]"
              />
              <Botao
                type="submit"
                disabled={alterarPrecoLote.isPending || precoLote === ''}
                className="px-3 py-1.5"
              >
                {alterarPrecoLote.isPending ? 'Aplicando...' : 'Aplicar preço'}
              </Botao>
              <button
                type="button"
                onClick={() => setSelecionados(new Set())}
                className="text-sm text-[var(--texto-muted)] hover:text-[var(--texto)]"
              >
                Limpar
              </button>
            </form>
          </div>
        )}

        {listaItens.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--texto-muted)]">Nenhuma peça consignada.</p>
        ) : (
          <>
            {pendentes.length > 0 ? (
              <ul className="divide-y divide-[var(--borda)]">{pendentes.map(renderItem)}</ul>
            ) : (
              <p className="px-5 py-4 text-sm text-[var(--texto-muted)]">Nenhuma peça pendente.</p>
            )}

            {vendidos.length > 0 && (
              <div className="border-t border-[var(--borda)]">
                <button
                  type="button"
                  onClick={() => setVendidosAbertos((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 bg-sucesso/5 px-5 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-sucesso">
                    <CheckCircle2 className="h-4 w-4" />
                    Vendidas ({vendidos.length})
                  </span>
                  {vendidosAbertos ? (
                    <ChevronDown className="h-4 w-4 text-sucesso" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-sucesso" />
                  )}
                </button>
                {vendidosAbertos && (
                  <ul className="divide-y divide-[var(--borda)]">{vendidos.map(renderItem)}</ul>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <ModalFaturarConsignacao
        aberto={modalFaturar}
        consignacaoId={id ?? null}
        saldo={saldo}
        onFechar={() => setModalFaturar(false)}
        onSalvo={() => {
          qc.invalidateQueries({ queryKey: ['consignacao', id] })
          qc.invalidateQueries({ queryKey: ['consignacao-recebimentos', id] })
        }}
      />

      <ModalEditarItemConsignacao
        aberto={Boolean(itemEditando)}
        item={itemEditando}
        consignacaoId={id ?? ''}
        onFechar={() => setItemEditando(null)}
      />
    </div>
  )
}
