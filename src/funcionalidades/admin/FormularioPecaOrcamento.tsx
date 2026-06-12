import { Plus, Trash2 } from 'lucide-react'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import {
  calcularPeca,
  formatarMoeda,
  type ConfigOperacional,
  type PecaCalculo,
  type ResultadoPeca,
} from '@/lib/calculadora'
import type { Material } from '@/tipos/database'

interface Props {
  config: ConfigOperacional
  peca: PecaCalculo
  onChange: (peca: PecaCalculo) => void
  resultado: ResultadoPeca | null
  onResultado: (r: ResultadoPeca | null) => void
  materiais?: Material[]
  mostrarCalcular?: boolean
}

export function FormularioPecaOrcamento({
  config,
  peca,
  onChange,
  resultado,
  onResultado,
  materiais = [],
  mostrarCalcular = true,
}: Props) {
  const filamentosMat = materiais.filter((m) => m.categoria === 'filamento')
  const insumosMat = materiais.filter((m) => m.categoria !== 'filamento')

  const calcular = () => onResultado(calcularPeca(config, peca))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          rotulo="Nome da peça *"
          value={peca.nomePeca}
          onChange={(e) => onChange({ ...peca, nomePeca: e.target.value })}
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <Input rotulo="Horas" type="number" value={peca.tempoHoras} onChange={(e) => onChange({ ...peca, tempoHoras: +e.target.value })} />
          <Input rotulo="Min" type="number" value={peca.tempoMinutos} onChange={(e) => onChange({ ...peca, tempoMinutos: +e.target.value })} />
          <Input rotulo="Qtd" type="number" min={1} value={peca.quantidade} onChange={(e) => onChange({ ...peca, quantidade: +e.target.value })} />
        </div>
      </div>

      <p className="text-xs font-medium text-[var(--texto-muted)]">Filamentos</p>
      {peca.filamentos.map((fil, idx) => (
        <div key={idx} className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-[var(--borda)] p-3 md:grid-cols-6">
          {filamentosMat.length > 0 && (
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-[var(--texto-secundario)]">Material estoque</span>
              <select
                value={fil.materialId ?? ''}
                onChange={(e) => {
                  const f = [...peca.filamentos]
                  const mat = filamentosMat.find((m) => m.id === e.target.value)
                  f[idx] = {
                    ...fil,
                    materialId: e.target.value || undefined,
                    tipo: mat?.tipoMaterial ?? fil.tipo,
                    cor: mat?.cor ?? fil.cor,
                    precoPorKg: mat ? Number(mat.custoMedioUnitario) * 1000 : fil.precoPorKg,
                  }
                  onChange({ ...peca, filamentos: f })
                }}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-2 py-2 text-sm"
              >
                <option value="">Manual</option>
                {filamentosMat.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </label>
          )}
          <Input rotulo="Tipo" value={fil.tipo} onChange={(e) => {
            const f = [...peca.filamentos]; f[idx] = { ...fil, tipo: e.target.value }; onChange({ ...peca, filamentos: f })
          }} />
          <Input rotulo="Cor" value={fil.cor} onChange={(e) => {
            const f = [...peca.filamentos]; f[idx] = { ...fil, cor: e.target.value }; onChange({ ...peca, filamentos: f })
          }} />
          <Input rotulo="R$/kg" type="number" value={fil.precoPorKg} onChange={(e) => {
            const f = [...peca.filamentos]; f[idx] = { ...fil, precoPorKg: +e.target.value }; onChange({ ...peca, filamentos: f })
          }} />
          <Input rotulo="Peso (g)" type="number" value={fil.pesoG} onChange={(e) => {
            const f = [...peca.filamentos]; f[idx] = { ...fil, pesoG: +e.target.value }; onChange({ ...peca, filamentos: f })
          }} />
          <div className="flex items-end">
            <button type="button" onClick={() => onChange({ ...peca, filamentos: peca.filamentos.filter((_, i) => i !== idx) })} className="text-erro">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
      <Botao
        variante="fantasma"
        type="button"
        onClick={() => onChange({ ...peca, filamentos: [...peca.filamentos, { tipo: 'PLA', cor: '', precoPorKg: 120, pesoG: 0 }] })}
      >
        <Plus className="h-4 w-4" /> Filamento
      </Botao>

      <p className="text-xs font-medium text-[var(--texto-muted)]">Insumos adicionais</p>
      {(peca.insumos ?? []).map((ins, idx) => (
        <div key={idx} className="mb-2 grid grid-cols-2 gap-2 rounded-lg border border-[var(--borda)] p-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="text-[var(--texto-secundario)]">Material</span>
            <select
              value={ins.materialId ?? ''}
              onChange={(e) => {
                const lista = [...(peca.insumos ?? [])]
                const mat = insumosMat.find((m) => m.id === e.target.value)
                lista[idx] = {
                  ...ins,
                  materialId: e.target.value,
                  nome: mat?.nome ?? ins.nome,
                  custoUnitario: mat ? Number(mat.custoMedioUnitario) : ins.custoUnitario,
                }
                onChange({ ...peca, insumos: lista })
              }}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-2 py-2 text-sm"
            >
              <option value="">Selecionar...</option>
              {insumosMat.map((m) => (
                <option key={m.id} value={m.id}>{m.nome} ({m.unidadeMedida})</option>
              ))}
            </select>
          </label>
          <Input rotulo="Quantidade" type="number" min={0} step="0.01" value={ins.quantidade} onChange={(e) => {
            const lista = [...(peca.insumos ?? [])]
            lista[idx] = { ...ins, quantidade: +e.target.value }
            onChange({ ...peca, insumos: lista })
          }} />
          <div className="flex items-end gap-2">
            <Input rotulo="Custo/un" type="number" step="0.0001" value={ins.custoUnitario} onChange={(e) => {
              const lista = [...(peca.insumos ?? [])]
              lista[idx] = { ...ins, custoUnitario: +e.target.value }
              onChange({ ...peca, insumos: lista })
            }} />
            <button type="button" onClick={() => onChange({ ...peca, insumos: (peca.insumos ?? []).filter((_, i) => i !== idx) })} className="text-erro">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
      <Botao
        variante="fantasma"
        type="button"
        onClick={() => onChange({ ...peca, insumos: [...(peca.insumos ?? []), { nome: '', quantidade: 1, custoUnitario: 0 }] })}
      >
        <Plus className="h-4 w-4" /> Insumo
      </Botao>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Observações</span>
        <textarea
          value={peca.observacoes}
          onChange={(e) => onChange({ ...peca, observacoes: e.target.value })}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
          rows={2}
        />
      </label>

      {mostrarCalcular && (
        <Botao type="button" onClick={calcular}>Calcular</Botao>
      )}

      {resultado && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-secondary-500/30 bg-secondary-500/5 p-4 md:grid-cols-5">
          <div><p className="text-xs text-[var(--texto-muted)]">Material</p><p className="font-semibold">{formatarMoeda(resultado.custoMaterial)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Energia</p><p className="font-semibold">{formatarMoeda(resultado.custoEnergia)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Depreciação</p><p className="font-semibold">{formatarMoeda(resultado.custoDepreciacao)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Unitário</p><p className="font-semibold text-secondary-600">{formatarMoeda(resultado.precoUnitario)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Total ({peca.quantidade}x)</p><p className="text-lg font-bold text-secondary-600">{formatarMoeda(resultado.precoTotal)}</p></div>
        </div>
      )}
    </div>
  )
}

export const pecaVazia = (): PecaCalculo => ({
  nomePeca: '',
  tempoHoras: 0,
  tempoMinutos: 0,
  quantidade: 1,
  observacoes: '',
  filamentos: [{ tipo: 'PLA', cor: '', precoPorKg: 120, pesoG: 0 }],
  insumos: [],
})
