import { Botao } from '@/componentes/ui/Botao'
import { CampoSelect } from '@/componentes/ui/CampoSelect'
import { Input } from '@/componentes/ui/Input'
import type { ErrosPecaOrcamento } from '@/funcionalidades/admin/pecaOrcamentoHelpers'
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
import { custoMedioDoMaterial, precoFilamentoPorKg } from '@/lib/estoque'
import { calcularTaxasShopee } from '@/lib/marketplace/shopee'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import type { Material } from '@/tipos/database'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

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
  const [maisPrecosAberto, setMaisPrecosAberto] = useState(false)
  const filamentosMat = materiais.filter((m) => m.categoria === 'filamento')
  const insumosMat = materiais.filter((m) => m.categoria !== 'filamento')
  const margem = params ?? paramsMargemDeConfig(config)

  const sugestaoShopee = useMemo(() => {
    if (!resultado || resultado.precoAntesTaxa < 0) return null
    try {
      return calcularTaxasShopee(resultado.precoAntesTaxa)
    } catch {
      return null
    }
  }, [resultado])

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
                if (!mat) {
                  f[idx] = { ...fil, materialId: '', precoPorKg: 0 }
                  onChange({ ...peca, filamentos: f })
                  return
                }
                f[idx] = {
                  materialId: mat.id,
                  tipo: mat.tipoMaterial ?? fil.tipo,
                  cor: mat.cor ?? fil.cor,
                  precoPorKg: precoFilamentoPorKg(mat),
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
                if (!e.target.value) {
                  lista[idx] = { ...ins, materialId: '', custoUnitario: 0 }
                } else {
                  lista[idx] = {
                    ...ins,
                    materialId: e.target.value,
                    nome: mat?.nome ?? ins.nome,
                    custoUnitario: custoMedioDoMaterial(mat),
                  }
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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-secondary-500/30 bg-secondary-500/5 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Custo produção</p>
              <p className="font-semibold">{formatarMoeda(resultado.custoProducaoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Venda direta</p>
              <p className="font-semibold">{formatarMoeda(resultado.precoVenda)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Preço final</p>
              <p className="font-semibold text-secondary-600">{formatarMoeda(resultado.precoFinal)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--texto-muted)]">Lucro</p>
              <p className="font-semibold text-sucesso">{formatarMoeda(resultado.lucroEfetivo)}</p>
            </div>
          </div>

          {sugestaoShopee && (
            <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setMaisPrecosAberto((v) => !v)}
                aria-expanded={maisPrecosAberto}
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
                  Mais preços sugeridos
                </span>
                {maisPrecosAberto ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--texto-muted)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--texto-muted)]" />
                )}
              </button>

              {maisPrecosAberto && (
                <div className="mt-3 space-y-3 border-t border-[var(--borda)] pt-3">
                  <p className="text-xs font-semibold text-[var(--texto-muted)]">Shopee (CNPJ)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[var(--borda)] p-3">
                      <p className="text-xs text-[var(--texto-muted)]">Cartão / boleto</p>
                      <p className="text-lg font-semibold text-secondary-600">
                        {formatarMoeda(sugestaoShopee.precoAnuncio)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--texto-muted)]">
                        Comissão {formatarMoeda(sugestaoShopee.cartaoBoleto.comissao)} · Líquido{' '}
                        {formatarMoeda(sugestaoShopee.cartaoBoleto.liquido)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--borda)] p-3">
                      <p className="text-xs text-[var(--texto-muted)]">Pix</p>
                      <p className="text-lg font-semibold text-secondary-600">
                        {formatarMoeda(sugestaoShopee.precoAnuncio)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--texto-muted)]">
                        Subsídio {formatarMoeda(sugestaoShopee.pix.subsidio)} · NF{' '}
                        {formatarMoeda(sugestaoShopee.pix.valorNota)} · Comissão{' '}
                        {formatarMoeda(sugestaoShopee.pix.comissao)} · Líquido{' '}
                        {formatarMoeda(sugestaoShopee.pix.liquido)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
