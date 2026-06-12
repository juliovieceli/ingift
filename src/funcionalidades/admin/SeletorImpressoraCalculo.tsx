import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'
import type { ImpressoraConfiguracao } from '@/tipos/database'

interface Props {
  className?: string
  onAlterar?: () => void
}

export function SeletorImpressoraCalculo({ className = '', onAlterar }: Props) {
  const { impressoraId } = useImpressoraCalculo()

  const impressoras = useQuery({
    queryKey: ['impressoras'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('ImpressoraConfiguracao').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as ImpressoraConfiguracao[]
    },
  })

  const selecionar = (id: string) => {
    const imp = impressoras.data?.find((i) => i.id === id)
    if (imp) {
      impressoraCalculoStore.aplicarImpressora(imp)
    } else {
      impressoraCalculoStore.setImpressoraId('')
    }
    onAlterar?.()
  }

  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-[var(--texto-secundario)]">Impressora para o cálculo</span>
      <select
        value={impressoraId}
        onChange={(e) => selecionar(e.target.value)}
        className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
      >
        <option value="">Selecionar impressora...</option>
        {impressoras.data?.map((i) => (
          <option key={i.id} value={i.id}>{i.nome}</option>
        ))}
      </select>
    </label>
  )
}
