import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { SeletorImpressoraCalculo } from '@/funcionalidades/admin/SeletorImpressoraCalculo'
import type { ConfigOperacional } from '@/lib/calculadora'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'

interface Props {
  onConfigAlterada?: () => void
  compacto?: boolean
}

export function PainelConfigCalculadora({ onConfigAlterada, compacto }: Props) {
  const qc = useQueryClient()
  const { impressoraId, config } = useImpressoraCalculo()

  const atualizarConfig = (campo: keyof ConfigOperacional, valor: number) => {
    impressoraCalculoStore.setConfig({ ...config, [campo]: valor })
    onConfigAlterada?.()
  }

  const salvarPadrao = async () => {
    if (!supabase || !impressoraId) return
    await supabase.from('ImpressoraConfiguracao').update({
      consumoKwh: config.consumoKwh,
      precoKwh: config.precoKwh,
      valorMaquina: config.valorMaquina,
      vidaUtilHoras: config.vidaUtilHoras,
      margemMultiplicador: config.margemMultiplicador,
      taxaFalha: config.taxaFalha,
      taxaMarketplace: config.taxaMarketplace,
    }).eq('id', impressoraId)
    qc.invalidateQueries({ queryKey: ['impressoras'] })
  }

  return (
    <div className={`space-y-4 rounded-xl border border-[var(--borda)] bg-[var(--fundo)]/50 p-4 ${compacto ? '' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
        Configuração operacional
      </p>
      <SeletorImpressoraCalculo onAlterar={onConfigAlterada} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Máquina / Energia</p>
          <div className="grid grid-cols-2 gap-2">
            <Input rotulo="Consumo (kWh)" type="number" step="0.01" value={config.consumoKwh} onChange={(e) => atualizarConfig('consumoKwh', +e.target.value)} />
            <Input rotulo="Preço kWh (R$)" type="number" step="0.01" value={config.precoKwh} onChange={(e) => atualizarConfig('precoKwh', +e.target.value)} />
            <Input rotulo="Valor máquina (R$)" type="number" value={config.valorMaquina} onChange={(e) => atualizarConfig('valorMaquina', +e.target.value)} />
            <Input rotulo="Vida útil (h)" type="number" value={config.vidaUtilHoras} onChange={(e) => atualizarConfig('vidaUtilHoras', +e.target.value)} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Margens e taxas</p>
          <div className="grid grid-cols-2 gap-2">
            <Input rotulo="Margem (mult.)" type="number" step="0.1" value={config.margemMultiplicador} onChange={(e) => atualizarConfig('margemMultiplicador', +e.target.value)} />
            <Input rotulo="Taxa falha" type="number" step="0.01" value={config.taxaFalha} onChange={(e) => atualizarConfig('taxaFalha', +e.target.value)} />
            <Input rotulo="Taxa marketplace" type="number" step="0.01" value={config.taxaMarketplace} onChange={(e) => atualizarConfig('taxaMarketplace', +e.target.value)} />
          </div>
        </div>
      </div>
      {impressoraId && (
        <Botao variante="fantasma" type="button" onClick={salvarPadrao}>
          Salvar como padrão desta impressora
        </Botao>
      )}
    </div>
  )
}
