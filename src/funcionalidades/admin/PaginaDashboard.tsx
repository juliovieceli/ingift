import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { Card } from '@/componentes/ui/Card'

export function PaginaDashboard() {
  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!supabase) return { clientes: 0, orcamentos: 0, estoqueBaixo: 0 }
      const [c, o, m] = await Promise.all([
        supabase.from('Cliente').select('id', { count: 'exact', head: true }),
        supabase.from('Orcamento').select('id', { count: 'exact', head: true }),
        supabase.from('Material').select('*').eq('ativo', true),
      ])
      const materiais = (m.data ?? []) as { estoqueAtual: number; estoqueReservado: number; estoqueMinimo: number }[]
      const estoqueBaixo = materiais.filter(
        (x) => x.estoqueAtual - x.estoqueReservado <= x.estoqueMinimo,
      ).length
      return { clientes: c.count ?? 0, orcamentos: o.count ?? 0, estoqueBaixo }
    },
  })

  const financeiro = useQuery({
    queryKey: ['dashboard-financeiro'],
    queryFn: async () => {
      if (!supabase) return { receitasPendentes: 0, despesasPendentes: 0, saldoCaixa: 0 }
      const [titulos, contas] = await Promise.all([
        supabase.from('FinanceiroTitulo').select('tipo, valor, valorBaixado, status'),
        supabase.from('FinanceiroContaCaixa').select('saldoAtual').eq('ativo', true),
      ])
      const tList = (titulos.data ?? []) as { tipo: string; valor: number; valorBaixado: number; status: string }[]
      const receitasPendentes = tList
        .filter((t) => t.tipo === 'receita' && t.status !== 'quitado')
        .reduce((s, t) => s + (Number(t.valor) - Number(t.valorBaixado)), 0)
      const despesasPendentes = tList
        .filter((t) => t.tipo === 'despesa' && t.status !== 'quitado')
        .reduce((s, t) => s + (Number(t.valor) - Number(t.valorBaixado)), 0)
      const saldoCaixa = (contas.data ?? []).reduce((s: number, c: { saldoAtual: number }) => s + Number(c.saldoAtual), 0)
      return { receitasPendentes, despesasPendentes, saldoCaixa }
    },
  })

  const itens = [
    { rotulo: 'Clientes', valor: stats.data?.clientes ?? '—' },
    { rotulo: 'Orçamentos', valor: stats.data?.orcamentos ?? '—' },
    { rotulo: 'Estoque baixo', valor: stats.data?.estoqueBaixo ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--texto)]">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {itens.map((item) => (
          <Card key={item.rotulo}>
            <p className="text-sm text-[var(--texto-muted)]">{item.rotulo}</p>
            <p className="mt-1 text-3xl font-bold text-[var(--texto)]">{item.valor}</p>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary-500">
          Financeiro
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-[var(--texto-muted)]">Receitas a receber</p>
            <p className="mt-1 text-2xl font-bold text-sucesso">
              {financeiro.data ? formatarMoeda(financeiro.data.receitasPendentes) : '—'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--texto-muted)]">Despesas a pagar</p>
            <p className="mt-1 text-2xl font-bold text-erro">
              {financeiro.data ? formatarMoeda(financeiro.data.despesasPendentes) : '—'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--texto-muted)]">Saldo em caixa</p>
            <p className={`mt-1 text-2xl font-bold ${(financeiro.data?.saldoCaixa ?? 0) >= 0 ? 'text-[var(--texto)]' : 'text-erro'}`}>
              {financeiro.data ? formatarMoeda(financeiro.data.saldoCaixa) : '—'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
