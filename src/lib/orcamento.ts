import type { SupabaseClient } from '@supabase/supabase-js'

import {
  calcularItemAvulso,
  calcularItemPeca,
  calcularTotaisOrcamento,
  composicaoParaPeca,
  configDeImpressora,
  configSnapshotDeConfig,
  paramsMargemDeConfig,
  pecaParaComposicao,
  type AvulsoCalculo,
  type ComposicaoLinha,
  type ConfigOperacional,
  type ParamsMargemItem,
  type PecaCalculo,
  type ResultadoItemCompleto,
} from '@/lib/calculadora'
import type { ImpressoraConfiguracao, OrcamentoItem, OrcamentoItemComposicao } from '@/tipos/database'

export type OrcamentoItemComComposicao = OrcamentoItem & {
  OrcamentoItemComposicao?: OrcamentoItemComposicao[]
}

export type SalvarItemPecaInput = {
  peca: PecaCalculo
  config: ConfigOperacional
  params?: Partial<ParamsMargemItem>
}

export type SalvarItemAvulsoInput = {
  avulso: AvulsoCalculo
  config: ConfigOperacional
  params?: Partial<ParamsMargemItem>
}

function mergeParams(config: ConfigOperacional, extra?: Partial<ParamsMargemItem>): ParamsMargemItem {
  return { ...paramsMargemDeConfig(config), ...extra }
}

function snapshotDeConfig(config: ConfigOperacional) {
  return {
    ...configSnapshotDeConfig(config),
    taxaFalha: config.taxaFalha,
    margemMultiplicador: config.margemMultiplicador,
    taxaMarketplace: config.taxaMarketplace,
  }
}

export function itemParaPeca(item: OrcamentoItemComComposicao): {
  peca: PecaCalculo
  composicao: ComposicaoLinha[]
  params: ParamsMargemItem
} {
  const comp = [...(item.OrcamentoItemComposicao ?? [])].sort((a, b) => a.ordem - b.ordem)
  const composicao: ComposicaoLinha[] = comp.map((c) => ({
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

  const peca = composicaoParaPeca(
    item.nomePeca,
    item.tempoHoras,
    item.tempoMinutos,
    item.quantidade,
    item.observacoes ?? '',
    composicao,
  )

  const params: ParamsMargemItem = {
    taxaFalha: Number(item.taxaFalha),
    margemMultiplicador: Number(item.margemMultiplicador),
    taxaMarketplace: Number(item.taxaMarketplace),
    adicional: Number(item.adicional),
    desconto: Number(item.desconto),
  }

  return { peca, composicao, params }
}

/**
 * Reconstrói a configuração operacional (máquina/energia/margens) que foi
 * usada e gravada como snapshot no item, para restaurar o formulário ao
 * editar — sem isso, o modal mantém os valores atuais do estado global
 * (impressora selecionada por último, etc.), que podem já ter mudado desde
 * que o item foi calculado.
 */
export function configDeItem(item: OrcamentoItem): ConfigOperacional {
  return {
    consumoKwh: Number(item.consumoKwh),
    precoKwh: Number(item.precoKwh),
    valorMaquina: Number(item.valorMaquina),
    vidaUtilHoras: Number(item.vidaUtilHoras),
    margemMultiplicador: Number(item.margemMultiplicador),
    taxaFalha: Number(item.taxaFalha),
    taxaMarketplace: Number(item.taxaMarketplace),
  }
}

/**
 * Compara (com tolerância a arredondamento) os valores de uma impressora
 * cadastrada com a configuração de um item, para tentar reselecionar no
 * formulário qual impressora foi usada — o item não guarda o id da
 * impressora, só o snapshot numérico.
 */
export function impressoraCombinaConfig(
  imp: ImpressoraConfiguracao,
  config: ConfigOperacional,
  tolerancia = 0.0001,
): boolean {
  const aprox = (a: number, b: number) => Math.abs(Number(a) - b) < tolerancia
  return (
    aprox(imp.consumoKwh, config.consumoKwh) &&
    aprox(imp.precoKwh, config.precoKwh) &&
    aprox(imp.valorMaquina, config.valorMaquina) &&
    aprox(imp.vidaUtilHoras, config.vidaUtilHoras) &&
    aprox(imp.margemMultiplicador, config.margemMultiplicador) &&
    aprox(imp.taxaFalha, config.taxaFalha) &&
    aprox(imp.taxaMarketplace, config.taxaMarketplace)
  )
}

export function itemParaAvulso(item: OrcamentoItemComComposicao): AvulsoCalculo {
  const qtd = Number(item.quantidade)
  return {
    nome: item.nomePeca,
    quantidade: qtd,
    custoUnitario: Number(item.custoUnitario) || (qtd > 0 ? Number(item.custoMaterial) / qtd : 0),
    materialId: item.materialId ?? undefined,
    aplicarMargem: item.aplicarMargem ?? true,
    observacoes: item.observacoes ?? '',
  }
}

async function salvarComposicaoItem(
  supabase: SupabaseClient,
  itemId: string,
  composicao: ComposicaoLinha[],
) {
  await supabase.from('OrcamentoItemComposicao').delete().eq('itemOrcamentoId', itemId)
  for (const [ordem, linha] of composicao.entries()) {
    const custoTotal = linha.categoria === 'filamento' && linha.pesoG != null
      ? linha.custoUnitario * linha.pesoG
      : linha.custoUnitario * linha.quantidade
    const { error } = await supabase.from('OrcamentoItemComposicao').insert({
      itemOrcamentoId: itemId,
      materialId: linha.materialId,
      categoria: linha.categoria,
      descricao: linha.descricao ?? linha.tipo ?? null,
      tipo: linha.tipo ?? null,
      cor: linha.cor ?? null,
      quantidade: linha.quantidade,
      unidadeMedida: linha.unidadeMedida,
      custoUnitario: linha.custoUnitario,
      custoTotal,
      pesoG: linha.pesoG ?? null,
      ordem,
    })
    if (error) throw error
  }
}

function rowItemPeca(
  orcamentoId: string,
  peca: PecaCalculo,
  resultado: ResultadoItemCompleto,
  config: ConfigOperacional,
  params: ParamsMargemItem,
  ordem: number,
) {
  return {
    orcamentoId,
    tipoItem: 'peca',
    aplicarMargem: true,
    nomePeca: peca.nomePeca,
    tempoHoras: peca.tempoHoras,
    tempoMinutos: peca.tempoMinutos,
    quantidade: peca.quantidade,
    pesoTotalG: resultado.pesoTotalG,
    observacoes: peca.observacoes || null,
    materialId: null,
    custoUnitario: 0,
    custoMaterial: resultado.custoMaterial,
    custoEnergia: resultado.custoEnergia,
    custoDepreciacao: resultado.custoDepreciacao,
    custoProducaoTotal: resultado.custoProducaoTotal,
    precoUnitario: resultado.precoUnitario,
    precoTotal: resultado.precoFinal,
    precoVenda: resultado.precoVenda,
    precoFinal: resultado.precoFinal,
    lucroEfetivo: resultado.lucroEfetivo,
    margemEfetiva: resultado.margemEfetiva,
    custoAposFalha: resultado.custoAposFalha,
    ...snapshotDeConfig(config),
    taxaFalha: params.taxaFalha,
    margemMultiplicador: params.margemMultiplicador,
    taxaMarketplace: params.taxaMarketplace,
    adicional: params.adicional,
    desconto: params.desconto,
    ordem,
  }
}

function rowItemAvulso(
  orcamentoId: string,
  avulso: AvulsoCalculo,
  resultado: ReturnType<typeof calcularItemAvulso>,
  config: ConfigOperacional,
  params: ParamsMargemItem,
  ordem: number,
) {
  return {
    orcamentoId,
    tipoItem: 'avulso',
    aplicarMargem: avulso.aplicarMargem,
    nomePeca: avulso.nome,
    tempoHoras: 0,
    tempoMinutos: 0,
    quantidade: avulso.quantidade,
    pesoTotalG: 0,
    observacoes: avulso.observacoes || null,
    materialId: avulso.materialId ?? null,
    custoUnitario: avulso.custoUnitario,
    custoMaterial: resultado.custoProducaoTotal,
    custoEnergia: 0,
    custoDepreciacao: 0,
    custoProducaoTotal: resultado.custoProducaoTotal,
    precoUnitario: resultado.precoUnitario,
    precoTotal: resultado.precoFinal,
    precoVenda: resultado.precoVenda,
    precoFinal: resultado.precoFinal,
    lucroEfetivo: resultado.lucroEfetivo,
    margemEfetiva: resultado.margemEfetiva,
    custoAposFalha: resultado.custoAposFalha,
    ...snapshotDeConfig(config),
    taxaFalha: params.taxaFalha,
    margemMultiplicador: params.margemMultiplicador,
    taxaMarketplace: params.taxaMarketplace,
    adicional: params.adicional,
    desconto: params.desconto,
    ordem,
  }
}

export async function recalcularTotaisOrcamento(supabase: SupabaseClient, orcamentoId: string) {
  const { data: itens } = await supabase
    .from('OrcamentoItem')
    .select('custoProducaoTotal, precoFinal, precoTotal')
    .eq('orcamentoId', orcamentoId)

  const lista = itens ?? []
  const totais = calcularTotaisOrcamento(
    lista.map((i) => ({
      custoProducaoTotal: Number(i.custoProducaoTotal) || 0,
      precoFinal: Number(i.precoFinal ?? i.precoTotal) || 0,
    })),
  )

  await supabase
    .from('Orcamento')
    .update({ custoSubtotal: totais.custoSubtotal, precoTotal: totais.precoTotal })
    .eq('id', orcamentoId)

  return totais
}

export async function salvarOrcamentoItem(
  supabase: SupabaseClient,
  orcamentoId: string,
  input: SalvarItemPecaInput,
  ordem: number,
  recalcular = true,
) {
  const params = mergeParams(input.config, input.params)
  const resultado = calcularItemPeca(configSnapshotDeConfig(input.config), input.peca, params)
  const composicao = pecaParaComposicao(input.peca)

  const { data: item, error: errItem } = await supabase
    .from('OrcamentoItem')
    .insert(rowItemPeca(orcamentoId, input.peca, resultado, input.config, params, ordem))
    .select('id')
    .single()

  if (errItem || !item) throw errItem ?? new Error('Falha ao criar item')

  await salvarComposicaoItem(supabase, item.id, composicao)

  if (recalcular) await recalcularTotaisOrcamento(supabase, orcamentoId)
}

export async function salvarItemAvulso(
  supabase: SupabaseClient,
  orcamentoId: string,
  input: SalvarItemAvulsoInput,
  ordem: number,
  recalcular = true,
) {
  const params = mergeParams(input.config, input.params)
  const resultado = calcularItemAvulso(input.avulso, params)

  const { error: errItem } = await supabase
    .from('OrcamentoItem')
    .insert(rowItemAvulso(orcamentoId, input.avulso, resultado, input.config, params, ordem))

  if (errItem) throw errItem

  if (recalcular) await recalcularTotaisOrcamento(supabase, orcamentoId)
}

export async function atualizarOrcamentoItem(
  supabase: SupabaseClient,
  orcamentoId: string,
  itemId: string,
  input: SalvarItemPecaInput,
) {
  const params = mergeParams(input.config, input.params)
  const resultado = calcularItemPeca(configSnapshotDeConfig(input.config), input.peca, params)
  const composicao = pecaParaComposicao(input.peca)

  const { error: errItem } = await supabase
    .from('OrcamentoItem')
    .update(rowItemPeca(orcamentoId, input.peca, resultado, input.config, params, 0))
    .eq('id', itemId)

  if (errItem) throw errItem

  await salvarComposicaoItem(supabase, itemId, composicao)
  await recalcularTotaisOrcamento(supabase, orcamentoId)
}

export async function atualizarItemAvulso(
  supabase: SupabaseClient,
  orcamentoId: string,
  itemId: string,
  input: SalvarItemAvulsoInput,
) {
  const params = mergeParams(input.config, input.params)
  const resultado = calcularItemAvulso(input.avulso, params)

  const { error: errItem } = await supabase
    .from('OrcamentoItem')
    .update(rowItemAvulso(orcamentoId, input.avulso, resultado, input.config, params, 0))
    .eq('id', itemId)

  if (errItem) throw errItem

  await recalcularTotaisOrcamento(supabase, orcamentoId)
}

export async function criarOrcamentoVazio(
  supabase: SupabaseClient,
  clienteId: string,
  opts?: { configuracaoImpressoraId?: string | null; validoAte?: string | null; prazoEntrega?: string | null },
) {
  const { data: status } = await supabase
    .from('OrcamentoStatus')
    .select('id')
    .eq('codigo', 'em_digitacao')
    .single()
  if (!status) throw new Error('Status em_digitacao não encontrado')

  const { data, error } = await supabase
    .from('Orcamento')
    .insert({
      clienteId,
      statusOrcamentoId: status.id,
      configuracaoImpressoraId: opts?.configuracaoImpressoraId ?? null,
      validoAte: opts?.validoAte ?? null,
      prazoEntrega: opts?.prazoEntrega ?? null,
      origem: 'manual',
      custoSubtotal: 0,
      precoTotal: 0,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Falha ao criar orçamento')
  return data.id
}

export { configDeImpressora }
