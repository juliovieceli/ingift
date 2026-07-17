import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { formatarMoeda, calcularCustoAvulso, type AvulsoCalculo } from '@/lib/calculadora'
import { custoMedioDoMaterial } from '@/lib/estoque'
import type { Material } from '@/tipos/database'
import { UNIDADE_FILAMENTO } from '@/lib/unidadesMedida'

interface Props {
  avulso: AvulsoCalculo
  onChange: (avulso: AvulsoCalculo) => void
  materiais?: Material[]
}

export function FormularioItemAvulso({ avulso, onChange, materiais = [] }: Props) {
  const opcoes = materiais.filter((m) => m.categoria !== 'filamento')
  const matSel = opcoes.find((m) => m.id === avulso.materialId)
  const custoTotal = calcularCustoAvulso(avulso)

  const selecionarMaterial = (materialId: string) => {
    const mat = opcoes.find((m) => m.id === materialId)
    if (!mat) {
      onChange({ ...avulso, materialId: undefined, custoUnitario: 0 })
      return
    }
    onChange({
      ...avulso,
      materialId: mat.id,
      nome: mat.nome,
      custoUnitario: custoMedioDoMaterial(mat),
    })
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Material do estoque (opcional)</span>
        <select
          value={avulso.materialId ?? ''}
          onChange={(e) => selecionarMaterial(e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
        >
          <option value="">Manual (frete, serviço...)</option>
          {opcoes.map((m) => (
            <option key={m.id} value={m.id}>{m.nome} ({m.categoria})</option>
          ))}
        </select>
      </label>

      <Input
        rotulo="Nome do item *"
        value={avulso.nome}
        onChange={(e) => onChange({ ...avulso, nome: e.target.value })}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          rotulo={`Quantidade${matSel ? ` (${matSel.unidadeMedida})` : ''}`}
          type="number"
          min={0.01}
          step="0.01"
          value={avulso.quantidade}
          onChange={(e) => onChange({ ...avulso, quantidade: +e.target.value })}
        />
        <Input
          rotulo={`Custo unitário (R$${matSel ? `/${matSel.unidadeMedida}` : ''})`}
          type="number"
          min={0}
          step="0.0001"
          value={avulso.custoUnitario}
          onChange={(e) => onChange({ ...avulso, custoUnitario: +e.target.value })}
        />
      </div>

      <Checkbox
        rotulo="Aplicar margem e taxa marketplace"
        checked={avulso.aplicarMargem}
        onChange={(checked) => onChange({ ...avulso, aplicarMargem: checked })}
      />

      <Checkbox
        rotulo="É frete (gera contas a pagar no faturamento)"
        checked={avulso.ehFrete ?? false}
        onChange={(checked) => onChange({ ...avulso, ehFrete: checked })}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Observações</span>
        <textarea
          value={avulso.observacoes ?? ''}
          onChange={(e) => onChange({ ...avulso, observacoes: e.target.value })}
          onFocus={selecionarTextoAoFocar}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
          rows={2}
        />
      </label>

      <div className="rounded-xl border border-secondary-500/30 bg-secondary-500/5 p-4">
        <p className="text-xs text-[var(--texto-muted)]">Custo total do item</p>
        <p className="text-lg font-bold text-secondary-600">{formatarMoeda(custoTotal)}</p>
        {matSel?.categoria === 'filamento' && avulso.custoUnitario > 0 && (
          <p className="mt-1 text-xs text-[var(--texto-muted)]">
            Equivalente: {formatarMoeda(avulso.custoUnitario * 1000)}/{UNIDADE_FILAMENTO === 'gr' ? 'kg' : 'un'}
          </p>
        )}
      </div>
    </div>
  )
}
