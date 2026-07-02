import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PortfolioGrupo } from '@/tipos/database'

interface Props {
  valor: string
  onChange: (valor: string) => void
}

async function buscarGruposPortfolio(): Promise<PortfolioGrupo[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('PortfolioGrupo').select('*').order('nome')
  if (error) throw error
  return (data ?? []) as PortfolioGrupo[]
}

export function CampoGrupoPortfolio({ valor, onChange }: Props) {
  const grupos = useQuery({
    queryKey: ['cms-portfolio-grupos'],
    queryFn: buscarGruposPortfolio,
  })

  const existentes = grupos.data ?? []

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="grupo-portfolio" className="text-[var(--texto-secundario)]">
        Grupo
      </label>

      <select
        id="grupo-portfolio"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)] outline-none focus:border-secondary-500"
      >
        <option value="">Sem grupo</option>
        {existentes.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </select>

      {grupos.isLoading && (
        <p className="text-xs text-[var(--texto-muted)]">Carregando grupos...</p>
      )}

      {!grupos.isLoading && existentes.length === 0 && (
        <p className="text-xs text-[var(--texto-muted)]">
          Nenhum grupo cadastrado. Crie um na aba Grupos.
        </p>
      )}

      <p className="text-xs text-[var(--texto-muted)]">
        Opcional. Associa o item a um grupo do portfólio.
      </p>
    </div>
  )
}
