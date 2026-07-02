import type { SupabaseClient } from '@supabase/supabase-js'

import {
  composicaoParaPeca,
  configDeImpressora,
  pecaParaComposicao,
  type ComposicaoLinha,
  type ConfigOperacional,
  type ParamsMargemItem,
  type PecaCalculo,
} from '@/lib/calculadora'
import { configDeItem, itemParaPeca, type OrcamentoItemComComposicao } from '@/lib/orcamento'
import { precoFilamentoPorKg } from '@/lib/estoque'
import type {
  ImpressoraConfiguracao,
  ItemOrcamentoModelo,
  ItemOrcamentoModeloComposicao,
  Material,
  OrcamentoItem,
} from '@/tipos/database'

export type ItemOrcamentoModeloComComposicao = ItemOrcamentoModelo & {
  ItemOrcamentoModeloComposicao?: ItemOrcamentoModeloComposicao[]
}

export type SalvarModeloPecaInput = {
  nome: string
  peca: PecaCalculo
  config: ConfigOperacional
  params: ParamsMargemItem
  configuracaoImpressoraId?: string | null
}

export type TipoDivergenciaPreco =
  | 'filamento'
  | 'insumo'
  | 'impressora'
  | 'margem'
  | 'material_ausente'

export interface DivergenciaPreco {
  tipo: TipoDivergenciaPreco
  descricao: string
  campo?: string
  materialId?: string
  valorModelo: number
  valorAtual: number
}

export type EscolhaPrecosModelo = 'atuais' | 'modelo'

const TOLERANCIA = 0.0001

function aprox(a: number, b: number, tolerancia = TOLERANCIA) {
  return Math.abs(Number(a) - b) < tolerancia
}

function configDeModelo(modelo: ItemOrcamentoModelo): ConfigOperacional {
  return {
    consumoKwh: Number(modelo.consumoKwh),
    precoKwh: Number(modelo.precoKwh),
    valorMaquina: Number(modelo.valorMaquina),
    vidaUtilHoras: Number(modelo.vidaUtilHoras),
    margemMultiplicador: Number(modelo.margemMultiplicador),
    taxaFalha: Number(modelo.taxaFalha),
    taxaMarketplace: Number(modelo.taxaMarketplace),
  }
}

function paramsDeModelo(modelo: ItemOrcamentoModelo): ParamsMargemItem {
  return {
    taxaFalha: Number(modelo.taxaFalha),
    margemMultiplicador: Number(modelo.margemMultiplicador),
    taxaMarketplace: Number(modelo.taxaMarketplace),
    adicional: Number(modelo.adicional),
    desconto: Number(modelo.desconto),
  }
}

function composicaoDeModelo(modelo: ItemOrcamentoModeloComComposicao): ComposicaoLinha[] {
  const comp = [...(modelo.ItemOrcamentoModeloComposicao ?? [])].sort((a, b) => a.ordem - b.ordem)
  return comp.map((c) => ({
    materialId: c.materialId,
    categoria: c.categoria,
    descricao: c.descricao ?? undefined,
    tipo: c.tipo ?? undefined,
    cor: c.cor ?? undefined,
    quantidade: Number(c.quantidade),
    unidadeMedida: c.unidadeMedida,
    custoUnitario: Number(c.custoUnitario),
    pesoG: c.pesoG != null ? Number(c.pesoG) : undefined,
  }))
}

export function modeloParaPeca(modelo: ItemOrcamentoModeloComComposicao): {
  peca: PecaCalculo
  config: ConfigOperacional
  params: ParamsMargemItem
  configuracaoImpressoraId: string | null
} {
  const composicao = composicaoDeModelo(modelo)
  const peca = composicaoParaPeca(
    modelo.nomePeca,
    modelo.tempoHoras,
    modelo.tempoMinutos,
    modelo.quantidade,
    modelo.observacoes ?? '',
    composicao,
  )
  return {
    peca,
    config: configDeModelo(modelo),
    params: paramsDeModelo(modelo),
    configuracaoImpressoraId: modelo.configuracaoImpressoraId,
  }
}

const CAMPOS_IMPRESSORA: { campo: keyof ConfigOperacional; rotulo: string }[] = [
  { campo: 'consumoKwh', rotulo: 'Consumo kWh' },
  { campo: 'precoKwh', rotulo: 'Preço kWh' },
  { campo: 'valorMaquina', rotulo: 'Valor máquina' },
  { campo: 'vidaUtilHoras', rotulo: 'Vida útil (h)' },
]

const CAMPOS_MARGEM: { campo: 'taxaFalha' | 'margemMultiplicador' | 'taxaMarketplace'; rotulo: string }[] = [
  { campo: 'taxaFalha', rotulo: 'Taxa de falha' },
  { campo: 'margemMultiplicador', rotulo: 'Margem (×)' },
  { campo: 'taxaMarketplace', rotulo: 'Taxa marketplace' },
]

export function compararModeloComPrecosAtuais(
  modelo: ItemOrcamentoModeloComComposicao,
  materiais: Material[],
  impressoraAtual?: ImpressoraConfiguracao | null,
): DivergenciaPreco[] {
  const divergencias: DivergenciaPreco[] = []
  const mapaMateriais = new Map(materiais.map((m) => [m.id, m]))
  const composicao = composicaoDeModelo(modelo)

  for (const linha of composicao) {
    const mat = mapaMateriais.get(linha.materialId)
    if (!mat || !mat.ativo) {
      divergencias.push({
        tipo: 'material_ausente',
        descricao: linha.descricao ?? linha.tipo ?? 'Material',
        materialId: linha.materialId,
        valorModelo: linha.custoUnitario,
        valorAtual: 0,
      })
      continue
    }

    const custoAtual =
      linha.categoria === 'filamento'
        ? Number(mat.custoMedioUnitario)
        : Number(mat.custoMedioUnitario)

    if (!aprox(linha.custoUnitario, custoAtual)) {
      divergencias.push({
        tipo: linha.categoria === 'filamento' ? 'filamento' : 'insumo',
        descricao: mat.nome,
        materialId: linha.materialId,
        valorModelo: linha.custoUnitario,
        valorAtual: custoAtual,
      })
    }
  }

  if (impressoraAtual) {
    const configModelo = configDeModelo(modelo)
    const configAtual = configDeImpressora(impressoraAtual)

    for (const { campo, rotulo } of CAMPOS_IMPRESSORA) {
      if (!aprox(configModelo[campo], configAtual[campo])) {
        divergencias.push({
          tipo: 'impressora',
          descricao: rotulo,
          campo,
          valorModelo: configModelo[campo],
          valorAtual: configAtual[campo],
        })
      }
    }

    const paramsModelo = paramsDeModelo(modelo)
    const paramsAtual = {
      taxaFalha: configAtual.taxaFalha,
      margemMultiplicador: configAtual.margemMultiplicador,
      taxaMarketplace: configAtual.taxaMarketplace,
    }

    for (const { campo, rotulo } of CAMPOS_MARGEM) {
      if (!aprox(paramsModelo[campo], paramsAtual[campo])) {
        divergencias.push({
          tipo: 'margem',
          descricao: rotulo,
          campo,
          valorModelo: paramsModelo[campo],
          valorAtual: paramsAtual[campo],
        })
      }
    }
  }

  return divergencias
}

export function aplicarModeloComEscolha(
  modelo: ItemOrcamentoModeloComComposicao,
  escolha: EscolhaPrecosModelo,
  materiais: Material[],
  impressoraAtual?: ImpressoraConfiguracao | null,
): { peca: PecaCalculo; config: ConfigOperacional; params: ParamsMargemItem } {
  const base = modeloParaPeca(modelo)

  if (escolha === 'modelo') {
    return { peca: base.peca, config: base.config, params: base.params }
  }

  const mapaMateriais = new Map(materiais.map((m) => [m.id, m]))
  const peca: PecaCalculo = {
    ...base.peca,
    filamentos: base.peca.filamentos.map((f) => {
      const mat = mapaMateriais.get(f.materialId)
      return {
        ...f,
        precoPorKg: mat ? precoFilamentoPorKg(mat) : f.precoPorKg,
      }
    }),
    insumos: (base.peca.insumos ?? []).map((i) => {
      const mat = mapaMateriais.get(i.materialId)
      return {
        ...i,
        custoUnitario: mat ? Number(mat.custoMedioUnitario) : i.custoUnitario,
      }
    }),
  }

  const config = impressoraAtual ? configDeImpressora(impressoraAtual) : base.config
  const params: ParamsMargemItem = {
    taxaFalha: config.taxaFalha,
    margemMultiplicador: config.margemMultiplicador,
    taxaMarketplace: config.taxaMarketplace,
    adicional: base.params.adicional,
    desconto: base.params.desconto,
  }

  return { peca, config, params }
}

async function salvarComposicaoModelo(
  supabase: SupabaseClient,
  modeloId: string,
  composicao: ComposicaoLinha[],
) {
  await supabase.from('ItemOrcamentoModeloComposicao').delete().eq('modeloItemId', modeloId)
  for (const [ordem, linha] of composicao.entries()) {
    const { error } = await supabase.from('ItemOrcamentoModeloComposicao').insert({
      modeloItemId: modeloId,
      materialId: linha.materialId,
      categoria: linha.categoria,
      descricao: linha.descricao ?? linha.tipo ?? null,
      tipo: linha.tipo ?? null,
      cor: linha.cor ?? null,
      quantidade: linha.quantidade,
      unidadeMedida: linha.unidadeMedida,
      custoUnitario: linha.custoUnitario,
      pesoG: linha.pesoG ?? null,
      ordem,
    })
    if (error) throw error
  }
}

function rowModelo(input: SalvarModeloPecaInput) {
  const { nome, peca, config, params } = input
  return {
    nome: nome.trim(),
    nomePeca: peca.nomePeca,
    tempoHoras: peca.tempoHoras,
    tempoMinutos: peca.tempoMinutos,
    quantidade: peca.quantidade,
    observacoes: peca.observacoes || null,
    configuracaoImpressoraId: input.configuracaoImpressoraId ?? null,
    consumoKwh: config.consumoKwh,
    precoKwh: config.precoKwh,
    valorMaquina: config.valorMaquina,
    vidaUtilHoras: config.vidaUtilHoras,
    taxaFalha: params.taxaFalha,
    margemMultiplicador: params.margemMultiplicador,
    taxaMarketplace: params.taxaMarketplace,
    adicional: params.adicional,
    desconto: params.desconto,
    ativo: true,
  }
}

export async function listarModelosPeca(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('ItemOrcamentoModelo')
    .select('*, ItemOrcamentoModeloComposicao(*)')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data ?? []) as ItemOrcamentoModeloComComposicao[]
}

export async function salvarModeloDePeca(supabase: SupabaseClient, input: SalvarModeloPecaInput) {
  const composicao = pecaParaComposicao(input.peca)
  const { data, error } = await supabase
    .from('ItemOrcamentoModelo')
    .insert(rowModelo(input))
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('Falha ao salvar modelo')
  await salvarComposicaoModelo(supabase, data.id, composicao)
  return data.id
}

export function modeloDeItemOrcamento(
  nome: string,
  item: OrcamentoItemComComposicao,
  configuracaoImpressoraId?: string | null,
): SalvarModeloPecaInput {
  const { peca, params } = itemParaPeca(item)
  return {
    nome,
    peca,
    config: configDeItem(item),
    params,
    configuracaoImpressoraId,
  }
}

export async function renomearModelo(supabase: SupabaseClient, id: string, nome: string) {
  const { error } = await supabase
    .from('ItemOrcamentoModelo')
    .update({ nome: nome.trim() })
    .eq('id', id)
  if (error) throw error
}

export async function excluirModelo(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('ItemOrcamentoModelo')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}

export function contarComposicao(modelo: ItemOrcamentoModeloComComposicao) {
  const comp = modelo.ItemOrcamentoModeloComposicao ?? []
  const filamentos = comp.filter((c) => c.categoria === 'filamento').length
  const insumos = comp.filter((c) => c.categoria !== 'filamento').length
  return { filamentos, insumos, total: comp.length }
}

type ItemParaModelo = Pick<
  OrcamentoItem,
  'nomePeca' | 'tempoHoras' | 'tempoMinutos' | 'quantidade' | 'observacoes'
> & {
  OrcamentoItemComposicao?: { ordem: number }[]
}

/** Indica se já existe modelo ativo com a mesma receita da peça. */
export function itemTemModeloCorrespondente(
  item: ItemParaModelo,
  modelos: ItemOrcamentoModeloComComposicao[],
): boolean {
  const qtdComp = item.OrcamentoItemComposicao?.length ?? 0
  return modelos.some((m) => {
    const compModelo = m.ItemOrcamentoModeloComposicao?.length ?? 0
    return (
      m.nomePeca === item.nomePeca &&
      m.tempoHoras === item.tempoHoras &&
      m.tempoMinutos === item.tempoMinutos &&
      m.quantidade === item.quantidade &&
      (m.observacoes ?? '') === (item.observacoes ?? '') &&
      compModelo === qtdComp
    )
  })
}
