import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PortfolioGrupo } from '@/tipos/database'

interface Props {
  valor: string[]
  onChange: (valor: string[]) => void
}

async function buscarGruposPortfolio(): Promise<PortfolioGrupo[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('PortfolioGrupo').select('*').order('nome')
  if (error) throw error
  return (data ?? []) as PortfolioGrupo[]
}

function classePill(selecionado: boolean): string {
  return `rounded-full px-3 py-1 text-sm transition ${
    selecionado
      ? 'bg-secondary-500 text-[var(--secundaria-fg)]'
      : 'border border-[var(--borda)] text-[var(--texto-secundario)] hover:border-secondary-500'
  }`
}

export function CampoGrupoPortfolio({ valor, onChange }: Props) {
  const grupos = useQuery({
    queryKey: ['cms-portfolio-grupos'],
    queryFn: buscarGruposPortfolio,
  })

  const existentes = grupos.data ?? []

  const alternar = (grupoId: string) => {
    if (valor.includes(grupoId)) {
      onChange(valor.filter((id) => id !== grupoId))
    } else {
      onChange([...valor, grupoId])
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-[var(--texto-secundario)]">Grupos</span>

      {grupos.isLoading && (
        <p className="text-xs text-[var(--texto-muted)]">Carregando grupos...</p>
      )}

      {!grupos.isLoading && existentes.length === 0 && (
        <p className="text-xs text-[var(--texto-muted)]">
          Nenhum grupo cadastrado. Crie um na aba Grupos.
        </p>
      )}

      {existentes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existentes.map((g) => {
            const selecionado = valor.includes(g.id)
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => alternar(g.id)}
                className={classePill(selecionado)}
                aria-pressed={selecionado}
              >
                {g.nome}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[var(--texto-muted)]">
        Opcional. Clique nos grupos para selecionar ou remover. Um item pode pertencer a vários.
      </p>
    </div>
  )
}
