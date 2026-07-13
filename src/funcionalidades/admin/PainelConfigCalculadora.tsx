import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { SeletorImpressoraCalculo } from '@/funcionalidades/admin/SeletorImpressoraCalculo'
import type { ConfigOperacional } from '@/lib/calculadora'
import { supabase } from '@/lib/supabase'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'

interface Props {
  onConfigAlterada?: () => void
  compacto?: boolean
  /** `cotacao`: só impressora + máquina/energia colapsada (sem margens duplicadas). */
  variante?: 'completo' | 'cotacao'
}

export function PainelConfigCalculadora({
  onConfigAlterada,
  compacto,
  variante = 'completo',
}: Props) {
  const qc = useQueryClient()
  const { impressoraId, config } = useImpressoraCalculo()
  const [avancadoAberto, setAvancadoAberto] = useState(false)
  const isCotacao = variante === 'cotacao'

  const atualizarConfig = (campo: keyof ConfigOperacional, valor: number) => {
    impressoraCalculoStore.setConfig({ ...config, [campo]: valor })
    onConfigAlterada?.()
  }

  const salvarPadrao = async () => {
    if (!supabase || !impressoraId) return
    const payload = isCotacao
      ? {
          consumoKwh: config.consumoKwh,
          precoKwh: config.precoKwh,
          valorMaquina: config.valorMaquina,
          vidaUtilHoras: config.vidaUtilHoras,
        }
      : {
          consumoKwh: config.consumoKwh,
          precoKwh: config.precoKwh,
          valorMaquina: config.valorMaquina,
          vidaUtilHoras: config.vidaUtilHoras,
          margemMultiplicador: config.margemMultiplicador,
          taxaFalha: config.taxaFalha,
          taxaMarketplace: config.taxaMarketplace,
        }
    await supabase.from('ImpressoraConfiguracao').update(payload).eq('id', impressoraId)
    qc.invalidateQueries({ queryKey: ['impressoras'] })
  }

  const camposMaquinaEnergia = (
    <div className="grid grid-cols-2 gap-2">
      <Input
        rotulo="Consumo (kWh)"
        type="number"
        step="0.01"
        value={config.consumoKwh}
        onChange={(e) => atualizarConfig('consumoKwh', +e.target.value)}
      />
      <Input
        rotulo="Preço kWh (R$)"
        type="number"
        step="0.01"
        value={config.precoKwh}
        onChange={(e) => atualizarConfig('precoKwh', +e.target.value)}
      />
      <Input
        rotulo="Valor máquina (R$)"
        type="number"
        value={config.valorMaquina}
        onChange={(e) => atualizarConfig('valorMaquina', +e.target.value)}
      />
      <Input
        rotulo="Vida útil (h)"
        type="number"
        value={config.vidaUtilHoras}
        onChange={(e) => atualizarConfig('vidaUtilHoras', +e.target.value)}
      />
    </div>
  )

  const botaoSalvarPadrao = impressoraId ? (
    <Botao variante="fantasma" type="button" onClick={salvarPadrao}>
      Salvar como padrão desta impressora
    </Botao>
  ) : null

  return (
    <div className={`space-y-4 rounded-xl border border-[var(--borda)] bg-[var(--fundo)]/50 p-4 ${compacto ? '' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
        Configuração operacional
      </p>
      <SeletorImpressoraCalculo onAlterar={onConfigAlterada} />

      {isCotacao ? (
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setAvancadoAberto((v) => !v)}
            aria-expanded={avancadoAberto}
          >
            <span className="text-xs font-medium text-[var(--texto-muted)]">
              Custos de máquina e energia
            </span>
            {avancadoAberto ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--texto-muted)]" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--texto-muted)]" />
            )}
          </button>
          {avancadoAberto && (
            <div className="mt-3 space-y-3">
              {camposMaquinaEnergia}
              {botaoSalvarPadrao}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Máquina / Energia</p>
              {camposMaquinaEnergia}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Margens e taxas</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  rotulo="Margem (mult.)"
                  type="number"
                  step="0.1"
                  value={config.margemMultiplicador}
                  onChange={(e) => atualizarConfig('margemMultiplicador', +e.target.value)}
                />
                <Input
                  rotulo="Taxa falha"
                  type="number"
                  step="0.01"
                  value={config.taxaFalha}
                  onChange={(e) => atualizarConfig('taxaFalha', +e.target.value)}
                />
                <Input
                  rotulo="Taxa marketplace"
                  type="number"
                  step="0.01"
                  value={config.taxaMarketplace}
                  onChange={(e) => atualizarConfig('taxaMarketplace', +e.target.value)}
                />
              </div>
            </div>
          </div>
          {botaoSalvarPadrao}
        </>
      )}
    </div>
  )
}
