import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card } from '@/componentes/ui/Card'

export function PaginaDashboard() {
  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!supabase) return { clientes: 0, orcamentos: 0, estoqueBaixo: 0 }
      const [c, o, f] = await Promise.all([
        supabase.from('Cliente').select('id', { count: 'exact', head: true }),
        supabase.from('Orcamento').select('id', { count: 'exact', head: true }),
        supabase.from('Filamento').select('*').eq('ativo', true),
      ])
      const filamentos = (f.data ?? []) as { estoqueGramas: number; estoqueReservadoGramas: number; estoqueMinimoG: number }[]
      const estoqueBaixo = filamentos.filter(
        (x) => x.estoqueGramas - x.estoqueReservadoGramas <= x.estoqueMinimoG
      ).length
      return {
        clientes: c.count ?? 0,
        orcamentos: o.count ?? 0,
        estoqueBaixo,
      }
    },
  })

  const itens = [
    { rotulo: 'Clientes', valor: stats.data?.clientes ?? '—' },
    { rotulo: 'Orçamentos', valor: stats.data?.orcamentos ?? '—' },
    { rotulo: 'Estoque baixo', valor: stats.data?.estoqueBaixo ?? '—' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--texto)]">Dashboard</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {itens.map((item) => (
          <Card key={item.rotulo}>
            <p className="text-sm text-[var(--texto-muted)]">{item.rotulo}</p>
            <p className="mt-1 text-3xl font-bold text-[var(--texto)]">{item.valor}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
