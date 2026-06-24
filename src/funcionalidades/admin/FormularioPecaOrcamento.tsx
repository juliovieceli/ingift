import { Plus, Trash2 } from 'lucide-react'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { Botao } from '@/componentes/ui/Botao'
import { CampoSelect } from '@/componentes/ui/CampoSelect'
import { Input } from '@/componentes/ui/Input'
import {
  calcularItemPeca,
  configSnapshotDeConfig,
  formatarMoeda,
  paramsMargemDeConfig,
  type ConfigOperacional,
  type ParamsMargemItem,
  type PecaCalculo,
  type ResultadoItemCompleto,
} from '@/lib/calculadora'
import type { Material } from '@/tipos/database'

export type ErrosPecaOrcamento = Record<string, string>

export function validarPecaOrcamento(peca: PecaCalculo): ErrosPecaOrcamento {
  const erros: ErrosPecaOrcamento = {}

  if (!peca.nomePeca.trim()) {
    erros.nomePeca = 'Informe o nome da peça'
  }
  if (!peca.quantidade || peca.quantidade < 1) {
    erros.quantidade = 'Quantidade mínima é 1'
  }
  if (peca.filamentos.length === 0) {
    erros.filamentos = 'Adicione pelo menos um filamento'
  }
  peca.filamentos.forEach((fil, idx) => {
    if (!fil.materialId) {
      erros[`filamento.${idx}.materialId`] = 'Selecione o material de estoque'
    }
    if (!fil.pesoG || fil.pesoG <= 0) {
      erros[`filamento.${idx}.pesoG`] = 'Informe o peso em gramas'
    }
  })

  return erros
}

interface Props {
  config: ConfigOperacional
  peca: PecaCalculo
  onChange: (peca: PecaCalculo) => void
  resultado: ResultadoItemCompleto | null
  params?: ParamsMargemItem
  materiais?: Material[]
  mostrarCalcular?: boolean
  erros?: ErrosPecaOrcamento
  onLimparErro?: (chave: string) => void
}

export function FormularioPecaOrcamento({
  config,
  peca,
  onChange,
  resultado,
  params,
  materiais = [],
  mostrarCalcular = true,
  erros = {},
  onLimparErro,
}: Props) {
  const filamentosMat = materiais.filter((m) => m.categoria === 'filamento')
  const insumosMat = materiais.filter((m) => m.categoria !== 'filamento')
  const margem = params ?? paramsMargemDeConfig(config)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          rotulo="Nome da peça *"
          value={peca.nomePeca}
          erro={erros.nomePeca}
          onChange={(e) => {
            onLimparErro?.('nomePeca')
            onChange({ ...peca, nomePeca: e.target.value })
          }}
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <Input rotulo="Horas" type="number" value={peca.tempoHoras} onChange={(e) => onChange({ ...peca, tempoHoras: +e.target.value })} />
          <Input rotulo="Min" type="number" value={peca.tempoMinutos} onChange={(e) => onChange({ ...peca, tempoMinutos: +e.target.value })} />
          <Input
            rotulo="Qtd"
            type="number"
            min={1}
            value={peca.quantidade}
            erro={erros.quantidade}
            onChange={(e) => {
              onLimparErro?.('quantidade')
              onChange({ ...peca, quantidade: +e.target.value })
            }}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--texto-muted)]">Filamentos</p>
        {erros.filamentos && <p className="mt-1 text-xs text-erro">{erros.filamentos}</p>}
      </div>
      {peca.filamentos.map((fil, idx) => (
        <div key={idx} className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-[var(--borda)] p-3 md:grid-cols-6">
          {filamentosMat.length > 0 && (
            <CampoSelect
              rotulo="Material estoque"
              className="text-sm md:col-span-2"
              value={fil.materialId}
              required
              erro={erros[`filamento.${idx}.materialId`]}
              onChange={(e) => {
                onLimparErro?.(`filamento.${idx}.materialId`)
                const f = [...peca.filamentos]
                const mat = filamentosMat.find((m) => m.id === e.target.value)
                if (!mat) return
                f[idx] = {
                  materialId: mat.id,
                  tipo: mat.tipoMaterial ?? fil.tipo,
                  cor: mat.cor ?? fil.cor,
                  precoPorKg: Number(mat.custoMedioUnitario) * 1000,
                  pesoG: fil.pesoG,
                }
                onChange({ ...peca, filamentos: f })
              }}
            >
              <option value="">Selecionar material...</option>
              {filamentosMat.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </CampoSelect>
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
          <Input rotulo="Peso (gr)" type="number" value={fil.pesoG} erro={erros[`filamento.${idx}.pesoG`]} onChange={(e) => {
            onLimparErro?.(`filamento.${idx}.pesoG`)
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
        onClick={() => {
          onLimparErro?.('filamentos')
          onChange({ ...peca, filamentos: [...peca.filamentos, { materialId: '', tipo: 'PLA', cor: '', precoPorKg: 0, pesoG: 0 }] })
        }}
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
        onClick={() => onChange({ ...peca, insumos: [...(peca.insumos ?? []), { materialId: '', nome: '', quantidade: 1, custoUnitario: 0 }] })}
      >
        <Plus className="h-4 w-4" /> Insumo
      </Botao>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Observações</span>
        <textarea
          value={peca.observacoes}
          onChange={(e) => onChange({ ...peca, observacoes: e.target.value })}
          onFocus={selecionarTextoAoFocar}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
          rows={2}
        />
      </label>

      {mostrarCalcular && (
        <Botao type="button" onClick={() => calcularItemPeca(configSnapshotDeConfig(config), peca, margem)}>
          Calcular
        </Botao>
      )}

      {resultado && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-secondary-500/30 bg-secondary-500/5 p-4 md:grid-cols-4">
          <div><p className="text-xs text-[var(--texto-muted)]">Custo produção</p><p className="font-semibold">{formatarMoeda(resultado.custoProducaoTotal)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Preço venda</p><p className="font-semibold">{formatarMoeda(resultado.precoVenda)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Preço final</p><p className="font-semibold text-secondary-600">{formatarMoeda(resultado.precoFinal)}</p></div>
          <div><p className="text-xs text-[var(--texto-muted)]">Lucro</p><p className="font-semibold text-sucesso">{formatarMoeda(resultado.lucroEfetivo)}</p></div>
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
  filamentos: [],
  insumos: [],
})
