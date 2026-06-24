import { Input } from '@/componentes/ui/Input'
import { formatarMoeda, formatarPercentual, type ParamsMargemItem } from '@/lib/calculadora'

interface Props {
  params: ParamsMargemItem
  onChange: (params: ParamsMargemItem) => void
  lucroEfetivo?: number
  margemEfetiva?: number
  precoFinal?: number
}

export function PainelParamsMargem({ params, onChange, lucroEfetivo, margemEfetiva, precoFinal }: Props) {
  const set = (campo: keyof ParamsMargemItem, valor: number) =>
    onChange({ ...params, [campo]: valor })

  return (
    <div className="space-y-3 rounded-xl border border-[var(--borda)] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
        Margem e preço do item
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Input
          rotulo="Taxa falha"
          type="number"
          step="0.01"
          value={params.taxaFalha}
          onChange={(e) => set('taxaFalha', +e.target.value)}
        />
        <Input
          rotulo="Margem (×)"
          type="number"
          step="0.1"
          value={params.margemMultiplicador}
          onChange={(e) => set('margemMultiplicador', +e.target.value)}
        />
        <Input
          rotulo="Marketplace"
          type="number"
          step="0.01"
          value={params.taxaMarketplace}
          onChange={(e) => set('taxaMarketplace', +e.target.value)}
        />
        <Input
          rotulo="Adicional (R$)"
          type="number"
          step="0.01"
          value={params.adicional}
          onChange={(e) => set('adicional', +e.target.value)}
        />
        <Input
          rotulo="Desconto (R$)"
          type="number"
          step="0.01"
          value={params.desconto}
          onChange={(e) => set('desconto', +e.target.value)}
        />
      </div>
      {precoFinal != null && (
        <div className="grid grid-cols-3 gap-3 border-t border-[var(--borda)] pt-3 text-sm">
          <div>
            <p className="text-xs text-[var(--texto-muted)]">Preço final</p>
            <p className="font-bold text-secondary-600">{formatarMoeda(precoFinal)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--texto-muted)]">Lucro efetivo</p>
            <p className="font-semibold text-sucesso">{formatarMoeda(lucroEfetivo ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--texto-muted)]">Margem efetiva</p>
            <p className="font-semibold">{formatarPercentual(margemEfetiva ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
