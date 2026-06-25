import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle, FileText, TrendingUp, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import {
  corStatusTitulo,
  estornarBaixaTitulo,
  excluirTituloFinanceiro,
  rotuloStatusTitulo,
  saldoPendente,
  buscarBaixasDeTitulo,
  type LinhaFluxo,
} from '@/lib/financeiro'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { Botao } from '@/componentes/ui/Botao'
import { Card } from '@/componentes/ui/Card'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { Modal } from '@/componentes/ui/Modal'
import { ModalPlanoConta } from '@/funcionalidades/admin/modais/ModalPlanoConta'
import { ModalContaCaixa } from '@/funcionalidades/admin/modais/ModalContaCaixa'
import { ModalTituloFinanceiro } from '@/funcionalidades/admin/modais/ModalTituloFinanceiro'
import { ModalBaixaTitulo } from '@/funcionalidades/admin/modais/ModalBaixaTitulo'
import type { FinanceiroBaixa, FinanceiroContaCaixa, FinanceiroPlanoConta, FinanceiroTitulo } from '@/tipos/database'

type Aba = 'titulos' | 'fluxo' | 'plano-contas' | 'contas-caixa'

type TituloComRelacoes = FinanceiroTitulo & {
  FinanceiroPlanoConta?: { nome: string } | null
  Cliente?: { nome: string } | null
  Orcamento?: { numeroSequencial: number } | null
}

type FiltroStatus = 'todos' | FinanceiroTitulo['status']
type FiltroTipo = 'todos' | 'receita' | 'despesa'

export function PaginaFinanceiro() {
  const qc = useQueryClient()
  const [aba, setAba] = useState<Aba>('titulos')

  // filtros da aba títulos
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  // modais
  const [modalTitulo, setModalTitulo] = useState<{
    aberto: boolean
    titulo: FinanceiroTitulo | null
    tipoInicial?: 'receita' | 'despesa'
  }>({ aberto: false, titulo: null })

  const [modalBaixa, setModalBaixa] = useState<{ aberto: boolean; titulo: FinanceiroTitulo | null }>({
    aberto: false,
    titulo: null,
  })

  const [modalBaixasLista, setModalBaixasLista] = useState<{ aberto: boolean; titulo: TituloComRelacoes | null }>({
    aberto: false,
    titulo: null,
  })

  const [modalPlanoConta, setModalPlanoConta] = useState<{ aberto: boolean; conta: FinanceiroPlanoConta | null }>({
    aberto: false,
    conta: null,
  })

  const [modalContaCaixa, setModalContaCaixa] = useState<{ aberto: boolean; conta: FinanceiroContaCaixa | null }>({
    aberto: false,
    conta: null,
  })

  const [erroGlobal, setErroGlobal] = useState('')
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [confirmExclusao, setConfirmExclusao] = useState<FinanceiroTitulo | null>(null)

  // ── Queries ──────────────────────────────────────────────────

  const titulos = useQuery({
    queryKey: ['financeiro-titulos', filtroTipo, filtroStatus],
    queryFn: async () => {
      if (!supabase) return []
      let q = supabase
        .from('FinanceiroTitulo')
        .select('*, FinanceiroPlanoConta(nome), Cliente(nome), Orcamento(numeroSequencial)')
        .order('dataVencimento', { ascending: true })
      if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo)
      if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as TituloComRelacoes[]
    },
  })

  const contasCaixa = useQuery({
    queryKey: ['contas-caixa'],
    enabled: aba === 'contas-caixa' || aba === 'fluxo',
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('FinanceiroContaCaixa')
        .select('*')
        .order('nome')
      return (data ?? []) as FinanceiroContaCaixa[]
    },
  })

  const planoContas = useQuery({
    queryKey: ['plano-contas'],
    enabled: aba === 'plano-contas',
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('FinanceiroPlanoConta')
        .select('*')
        .order('tipo')
        .order('ordem')
      return (data ?? []) as FinanceiroPlanoConta[]
    },
  })

  const fluxo = useQuery({
    queryKey: ['fluxo-caixa'],
    enabled: aba === 'fluxo',
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.rpc('fluxoCaixaMensal', {})
      if (error) throw error
      return (data ?? []) as LinhaFluxo[]
    },
  })

  const baixasModal = useQuery({
    queryKey: ['baixas-titulo', modalBaixasLista.titulo?.id],
    enabled: modalBaixasLista.aberto && Boolean(modalBaixasLista.titulo),
    queryFn: async () => {
      if (!supabase || !modalBaixasLista.titulo) return []
      return buscarBaixasDeTitulo(supabase, modalBaixasLista.titulo.id)
    },
  })

  // ── Mutations ─────────────────────────────────────────────────

  const excluirTitulo = useMutation({
    mutationFn: async ({ titulo, motivo }: { titulo: FinanceiroTitulo; motivo: string }) => {
      if (!supabase) throw new Error('Supabase não configurado')
      await excluirTituloFinanceiro(supabase, titulo.id, motivo || undefined)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      setConfirmExclusao(null)
      setMotivoExclusao('')
    },
    onError: (e) => setErroGlobal(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const estornarBaixa = useMutation({
    mutationFn: async (baixaId: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!confirm('Estornar esta baixa?')) return
      await estornarBaixaTitulo(supabase, baixaId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['baixas-titulo'] })
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
    },
    onError: (e) => setErroGlobal(e instanceof Error ? e.message : 'Erro ao estornar'),
  })

  // ── Tabela de títulos ────────────────────────────────────────

  const tabelaTitulos = useOrdenacaoPaginacao(titulos.data ?? [], 'dataVencimento', 'asc')
  const tabelaPlano = useOrdenacaoPaginacao(planoContas.data ?? [], 'tipo', 'asc')
  const tabelaContas = useOrdenacaoPaginacao(contasCaixa.data ?? [], 'nome', 'asc')

  function origemTitulo(t: TituloComRelacoes): string {
    if (t.Orcamento) return `Orçamento #${t.Orcamento.numeroSequencial}`
    if (t.movimentacaoEstoqueId) return 'Compra estoque'
    return 'Manual'
  }

  // ── Totais rápidos ────────────────────────────────────────────

  const totalReceitas = (titulos.data ?? [])
    .filter((t) => t.tipo === 'receita' && t.status !== 'quitado')
    .reduce((s, t) => s + saldoPendente(t), 0)

  const totalDespesas = (titulos.data ?? [])
    .filter((t) => t.tipo === 'despesa' && t.status !== 'quitado')
    .reduce((s, t) => s + saldoPendente(t), 0)

  const saldoCaixa = (contasCaixa.data ?? [])
    .filter((c) => c.ativo)
    .reduce((s, c) => s + Number(c.saldoAtual), 0)

  // ── ABA helpers ─────────────────────────────────────────────

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'titulos', rotulo: 'Títulos' },
    { id: 'fluxo', rotulo: 'Fluxo de caixa' },
    { id: 'plano-contas', rotulo: 'Plano de contas' },
    { id: 'contas-caixa', rotulo: 'Contas caixa' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[var(--texto)]">Financeiro</h2>
      </div>

      {/* Cartões de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-8 w-8 shrink-0 text-sucesso" />
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Receitas pendentes</p>
              <p className="text-xl font-bold text-[var(--texto)]">{formatarMoeda(totalReceitas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 shrink-0 text-erro" />
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Despesas pendentes</p>
              <p className="text-xl font-bold text-[var(--texto)]">{formatarMoeda(totalDespesas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 shrink-0 text-[var(--primaria)]" />
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Saldo em caixa</p>
              <p className="text-xl font-bold text-[var(--texto)]">{formatarMoeda(saldoCaixa)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-[var(--borda)]">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              aba === a.id
                ? 'border-b-2 border-[var(--primaria)] text-[var(--primaria)]'
                : 'text-[var(--texto-muted)] hover:text-[var(--texto)]'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {erroGlobal && (
        <p className="text-sm text-erro">{erroGlobal}</p>
      )}

      {/* ── ABA: TÍTULOS ────────────────────────────────────────── */}
      {aba === 'titulos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-1.5 text-sm text-[var(--texto)]"
              >
                <option value="todos">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-1.5 text-sm text-[var(--texto)]"
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="quitado">Quitado</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Botao
                variante="fantasma"
                onClick={() => setModalTitulo({ aberto: true, titulo: null, tipoInicial: 'despesa' })}
              >
                <ArrowDownCircle className="h-4 w-4" /> Nova despesa
              </Botao>
              <Botao
                onClick={() => setModalTitulo({ aberto: true, titulo: null, tipoInicial: 'receita' })}
              >
                <Plus className="h-4 w-4" /> Nova receita
              </Botao>
            </div>
          </div>

          <TabelaDados<TituloComRelacoes>
            dados={tabelaTitulos.dadosPaginados}
            chave={(t) => t.id}
            colunas={[
              {
                id: 'descricao',
                rotulo: 'Descrição',
                render: (t) => (
                  <div>
                    <p className="font-medium text-[var(--texto)]">{t.descricao}</p>
                    <p className="text-xs text-[var(--texto-muted)]">{origemTitulo(t)}</p>
                  </div>
                ),
              },
              {
                id: 'tipo',
                rotulo: 'Tipo',
                render: (t) => (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.tipo === 'receita'
                      ? 'bg-sucesso/10 text-sucesso'
                      : 'bg-erro/10 text-erro'
                  }`}>
                    {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                ),
              },
              {
                id: 'FinanceiroPlanoConta',
                rotulo: 'Conta',
                render: (t) => (
                  <span className="text-sm text-[var(--texto-secundario)]">
                    {t.FinanceiroPlanoConta?.nome ?? '—'}
                  </span>
                ),
              },
              {
                id: 'valor',
                rotulo: 'Valor',
                render: (t) => formatarMoeda(t.valor),
              },
              {
                id: 'valorBaixado',
                rotulo: 'Recebido/Pago',
                render: (t) => (
                  <span className={t.valorBaixado > 0 ? 'text-sucesso' : ''}>
                    {formatarMoeda(t.valorBaixado)}
                  </span>
                ),
              },
              {
                id: 'status',
                rotulo: 'Status',
                render: (t) => (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${corStatusTitulo(t.status)}22`, color: corStatusTitulo(t.status) }}
                  >
                    {rotuloStatusTitulo(t.status)}
                  </span>
                ),
              },
              {
                id: 'dataVencimento',
                rotulo: 'Vencimento',
                render: (t) => {
                  const hoje = new Date().toISOString().slice(0, 10)
                  const vencido = t.status !== 'quitado' && t.dataVencimento < hoje
                  return (
                    <span className={vencido ? 'font-medium text-erro' : ''}>
                      {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )
                },
              },
              {
                id: 'acoes',
                rotulo: '',
                render: (t) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setModalBaixasLista({ aberto: true, titulo: t }) }}
                      className="text-xs text-[var(--texto-muted)] hover:text-[var(--texto)]"
                      title="Ver baixas"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    {t.status !== 'quitado' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalBaixa({ aberto: true, titulo: t })
                        }}
                        className="text-xs text-[var(--primaria)] hover:underline"
                      >
                        Baixar
                      </button>
                    )}
                    {!t.orcamentoId && t.valorBaixado === 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setErroGlobal('')
                          setMotivoExclusao('')
                          setConfirmExclusao(t)
                        }}
                        className="text-xs text-erro hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            ordenacao={tabelaTitulos.ordenacao}
            onOrdenar={tabelaTitulos.alternarOrdenacao}
            pagina={tabelaTitulos.pagina}
            totalPaginas={tabelaTitulos.totalPaginas}
            totalItens={tabelaTitulos.totalItens}
            itensPorPagina={tabelaTitulos.itensPorPagina}
            onPagina={tabelaTitulos.irParaPagina}
            onItensPorPagina={tabelaTitulos.setItensPorPagina}
            vazio="Nenhum título encontrado."
          />
        </div>
      )}

      {/* ── ABA: FLUXO DE CAIXA ─────────────────────────────────── */}
      {aba === 'fluxo' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(contasCaixa.data ?? []).filter((c) => c.ativo).map((c) => (
              <Card key={c.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[var(--primaria)]" />
                  <div>
                    <p className="text-xs text-[var(--texto-muted)]">{c.nome}</p>
                    <p className="text-lg font-bold text-[var(--texto)]">{formatarMoeda(c.saldoAtual)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary-500">
              <TrendingUp className="h-4 w-4" /> Projeção mensal (próximos 6 meses)
            </div>
            {fluxo.isLoading ? (
              <p className="mt-3 text-sm text-[var(--texto-muted)]">Carregando...</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                      <th className="py-2 text-left">Mês</th>
                      <th className="py-2 text-right text-sucesso">Receitas</th>
                      <th className="py-2 text-right text-erro">Despesas</th>
                      <th className="py-2 text-right">Saldo do período</th>
                      <th className="py-2 text-right">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fluxo.data ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[var(--texto-muted)]">
                          Sem títulos pendentes no período.
                        </td>
                      </tr>
                    )}
                    {(() => {
                      let acumulado = saldoCaixa
                      return (fluxo.data ?? []).map((linha) => {
                        acumulado += Number(linha.saldoPeriodo)
                        return (
                          <tr key={linha.mes} className="border-t border-[var(--borda)]">
                            <td className="py-2">
                              {new Date(linha.mes + '-01T12:00:00').toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2 text-right text-sucesso">
                              {formatarMoeda(linha.receitas)}
                            </td>
                            <td className="py-2 text-right text-erro">
                              {formatarMoeda(linha.despesas)}
                            </td>
                            <td className={`py-2 text-right font-medium ${linha.saldoPeriodo >= 0 ? 'text-sucesso' : 'text-erro'}`}>
                              {formatarMoeda(linha.saldoPeriodo)}
                            </td>
                            <td className={`py-2 text-right font-semibold ${acumulado >= 0 ? 'text-[var(--texto)]' : 'text-erro'}`}>
                              {formatarMoeda(acumulado)}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ABA: PLANO DE CONTAS ─────────────────────────────────── */}
      {aba === 'plano-contas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Botao onClick={() => setModalPlanoConta({ aberto: true, conta: null })}>
              <Plus className="h-4 w-4" /> Nova conta
            </Botao>
          </div>
          <TabelaDados<FinanceiroPlanoConta>
            dados={tabelaPlano.dadosPaginados}
            chave={(c) => c.id}
            onLinhaClick={(c) => setModalPlanoConta({ aberto: true, conta: c })}
            colunas={[
              { id: 'nome', rotulo: 'Nome', ordenavel: true },
              {
                id: 'tipo',
                rotulo: 'Tipo',
                render: (c) => (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.tipo === 'receita' ? 'bg-sucesso/10 text-sucesso' : 'bg-erro/10 text-erro'
                  }`}>
                    {c.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                ),
              },
              { id: 'ordem', rotulo: 'Ordem', ordenavel: true },
              {
                id: 'ativo',
                rotulo: 'Status',
                render: (c) => (
                  <span className={c.ativo ? 'text-sucesso' : 'text-[var(--texto-muted)]'}>
                    {c.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                ),
              },
            ]}
            ordenacao={tabelaPlano.ordenacao}
            onOrdenar={tabelaPlano.alternarOrdenacao}
            pagina={tabelaPlano.pagina}
            totalPaginas={tabelaPlano.totalPaginas}
            totalItens={tabelaPlano.totalItens}
            itensPorPagina={tabelaPlano.itensPorPagina}
            onPagina={tabelaPlano.irParaPagina}
            onItensPorPagina={tabelaPlano.setItensPorPagina}
            vazio="Nenhuma conta cadastrada."
          />
        </div>
      )}

      {/* ── ABA: CONTAS CAIXA ────────────────────────────────────── */}
      {aba === 'contas-caixa' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Botao onClick={() => setModalContaCaixa({ aberto: true, conta: null })}>
              <Plus className="h-4 w-4" /> Nova conta
            </Botao>
          </div>
          <TabelaDados<FinanceiroContaCaixa>
            dados={tabelaContas.dadosPaginados}
            chave={(c) => c.id}
            onLinhaClick={(c) => setModalContaCaixa({ aberto: true, conta: c })}
            colunas={[
              { id: 'nome', rotulo: 'Nome', ordenavel: true },
              {
                id: 'tipo',
                rotulo: 'Tipo',
                render: (c) => ({
                  caixa: 'Caixa físico',
                  banco: 'Conta bancária',
                  pix: 'PIX',
                  outro: 'Outro',
                }[c.tipo] ?? c.tipo),
              },
              {
                id: 'saldoAtual',
                rotulo: 'Saldo atual',
                render: (c) => (
                  <span className={c.saldoAtual < 0 ? 'font-semibold text-erro' : 'font-semibold text-sucesso'}>
                    {formatarMoeda(c.saldoAtual)}
                  </span>
                ),
              },
              {
                id: 'ativo',
                rotulo: 'Status',
                render: (c) => (
                  <span className={c.ativo ? 'text-sucesso' : 'text-[var(--texto-muted)]'}>
                    {c.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                ),
              },
            ]}
            ordenacao={tabelaContas.ordenacao}
            onOrdenar={tabelaContas.alternarOrdenacao}
            pagina={tabelaContas.pagina}
            totalPaginas={tabelaContas.totalPaginas}
            totalItens={tabelaContas.totalItens}
            itensPorPagina={tabelaContas.itensPorPagina}
            onPagina={tabelaContas.irParaPagina}
            onItensPorPagina={tabelaContas.setItensPorPagina}
            vazio="Nenhuma conta cadastrada."
          />
        </div>
      )}

      {/* ── MODAL: CONFIRMAÇÃO EXCLUSÃO ──────────────────────────── */}
      {confirmExclusao && (
        <Modal
          aberto={Boolean(confirmExclusao)}
          onFechar={() => { setConfirmExclusao(null); setMotivoExclusao('') }}
          titulo="Excluir título"
          largura="md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--texto-secundario)]">
              Confirma a exclusão do título <strong>{confirmExclusao.descricao}</strong>? Esta ação é
              irreversível e será registrada em log.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--texto-secundario)]">Motivo (opcional)</span>
              <input
                type="text"
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
                placeholder="Informe o motivo..."
              />
            </label>
            {erroGlobal && <p className="text-sm text-erro">{erroGlobal}</p>}
            <div className="flex justify-end gap-2">
              <Botao
                variante="fantasma"
                onClick={() => { setConfirmExclusao(null); setMotivoExclusao('') }}
              >
                Cancelar
              </Botao>
              <Botao
                className="bg-erro text-white hover:bg-erro/90"
                onClick={() => excluirTitulo.mutate({ titulo: confirmExclusao, motivo: motivoExclusao })}
                disabled={excluirTitulo.isPending}
              >
                {excluirTitulo.isPending ? 'Excluindo...' : 'Excluir'}
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: BAIXAS DE UM TÍTULO ───────────────────────────── */}
      <Modal
        aberto={modalBaixasLista.aberto}
        onFechar={() => setModalBaixasLista({ aberto: false, titulo: null })}
        titulo={`Baixas — ${modalBaixasLista.titulo?.descricao ?? ''}`}
        largura="md"
      >
        <div className="space-y-3">
          {baixasModal.isLoading && (
            <p className="text-sm text-[var(--texto-muted)]">Carregando...</p>
          )}
          {(baixasModal.data ?? []).length === 0 && !baixasModal.isLoading && (
            <p className="text-sm text-[var(--texto-muted)]">Nenhuma baixa registrada.</p>
          )}
          {(baixasModal.data ?? []).map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-[var(--borda)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--texto)]">{formatarMoeda(b.valor)}</p>
                <p className="text-xs text-[var(--texto-muted)]">
                  {new Date(b.dataBaixa + 'T12:00:00').toLocaleDateString('pt-BR')}
                  {(b as FinanceiroBaixa & { FinanceiroContaCaixa?: { nome: string } }).FinanceiroContaCaixa?.nome
                    ? ` — ${(b as FinanceiroBaixa & { FinanceiroContaCaixa?: { nome: string } }).FinanceiroContaCaixa!.nome}`
                    : ''}
                  {b.observacoes ? ` · ${b.observacoes}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => estornarBaixa.mutate(b.id)}
                disabled={estornarBaixa.isPending}
                className="text-xs text-alerta hover:underline disabled:opacity-50"
              >
                Estornar
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── MODAIS CRUD ──────────────────────────────────────────── */}
      <ModalTituloFinanceiro
        aberto={modalTitulo.aberto}
        titulo={modalTitulo.titulo}
        tipoInicial={modalTitulo.tipoInicial}
        onFechar={() => setModalTitulo({ aberto: false, titulo: null })}
        onSalvo={() => qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })}
      />

      <ModalBaixaTitulo
        aberto={modalBaixa.aberto}
        titulo={modalBaixa.titulo}
        onFechar={() => setModalBaixa({ aberto: false, titulo: null })}
        onSalvo={() => {}}
      />

      <ModalPlanoConta
        aberto={modalPlanoConta.aberto}
        conta={modalPlanoConta.conta}
        onFechar={() => setModalPlanoConta({ aberto: false, conta: null })}
        onSalvo={() => {}}
      />

      <ModalContaCaixa
        aberto={modalContaCaixa.aberto}
        conta={modalContaCaixa.conta}
        onFechar={() => setModalContaCaixa({ aberto: false, conta: null })}
        onSalvo={() => {}}
      />
    </div>
  )
}
