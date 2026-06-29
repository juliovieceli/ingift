import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { supabase } from '@/lib/supabase'

interface Props {
  valor: string
  onChange: (valor: string) => void
}

async function buscarGruposPortfolio(): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('PortfolioItem').select('grupo')
  if (error) throw error

  const set = new Set<string>()
  for (const row of data ?? []) {
    const g = row.grupo?.trim()
    if (g) set.add(g)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function CampoGrupoPortfolio({ valor, onChange }: Props) {
  const inputId = useId()
  const listaId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [listaAberta, setListaAberta] = useState(false)

  const grupos = useQuery({
    queryKey: ['cms-portfolio-grupos'],
    queryFn: buscarGruposPortfolio,
  })

  const existentes = grupos.data ?? []

  useEffect(() => {
    if (!listaAberta) return
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setListaAberta(false)
      }
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [listaAberta])

  const abrirLista = () => {
    if (existentes.length > 0) setListaAberta(true)
  }

  const escolher = (g: string) => {
    onChange(g)
    setListaAberta(false)
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={inputId} className="text-[var(--texto-secundario)]">
        Grupo
      </label>

      <div ref={ref} className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={listaAberta}
          aria-controls={listaId}
          aria-autocomplete="list"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            selecionarTextoAoFocar(e)
            abrirLista()
          }}
          placeholder="Digite ou escolha um grupo"
          className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie)] py-2 pl-3 pr-10 text-[var(--texto)] outline-none focus:border-secondary-500"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (listaAberta ? setListaAberta(false) : abrirLista())}
          disabled={grupos.isLoading || existentes.length === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--texto-muted)] transition hover:text-[var(--texto)] disabled:opacity-40"
          aria-label="Mostrar grupos cadastrados"
        >
          <ChevronDown className={`h-4 w-4 transition ${listaAberta ? 'rotate-180' : ''}`} />
        </button>

        {listaAberta && existentes.length > 0 && (
          <ul
            id={listaId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--borda)] bg-[var(--superficie)] py-1 shadow-lg"
          >
            {existentes.map((g) => (
              <li key={g} role="option" aria-selected={valor.trim() === g}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(g)}
                  className={`w-full px-3 py-2 text-left transition hover:bg-[var(--superficie-elevada)] ${
                    valor.trim() === g ? 'bg-[var(--superficie-elevada)] font-medium text-[var(--texto)]' : 'text-[var(--texto-secundario)]'
                  }`}
                >
                  {g}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {grupos.isLoading && (
        <p className="text-xs text-[var(--texto-muted)]">Carregando grupos...</p>
      )}

      <p className="text-xs text-[var(--texto-muted)]">
        Opcional. Escolha um grupo existente ou digite um novo para filtrar na página de catálogo.
      </p>
    </div>
  )
}
