export interface ConfigOperacional {
  consumoKwh: number
  precoKwh: number
  valorMaquina: number
  vidaUtilHoras: number
  margemMultiplicador: number
  taxaFalha: number
  taxaMarketplace: number
}

export type ConfigSnapshot = Pick<
  ConfigOperacional,
  'consumoKwh' | 'precoKwh' | 'valorMaquina' | 'vidaUtilHoras'
>

export interface ParamsMargemItem {
  taxaFalha: number
  margemMultiplicador: number
  taxaMarketplace: number
  adicional: number
  desconto: number
}

export type TipoItemOrcamento = 'peca' | 'avulso'

export interface ComposicaoLinha {
  materialId: string
  categoria: string
  descricao?: string
  tipo?: string
  cor?: string
  quantidade: number
  unidadeMedida: string
  custoUnitario: number
  pesoG?: number
}

export interface FilamentoPeca {
  tipo: string
  cor: string
  precoPorKg: number
  pesoG: number
  materialId: string
}

export interface InsumoPeca {
  materialId: string
  nome: string
  quantidade: number
  custoUnitario: number
  categoria?: string
  unidadeMedida?: string
}

export interface PecaCalculo {
  nomePeca: string
  tempoHoras: number
  tempoMinutos: number
  quantidade: number
  observacoes: string
  filamentos: FilamentoPeca[]
  insumos: InsumoPeca[]
}

export interface AvulsoCalculo {
  nome: string
  quantidade: number
  custoUnitario: number
  materialId?: string
  aplicarMargem: boolean
  ehFrete?: boolean
  observacoes?: string
}

export interface ResultadoPeca {
  pesoTotalG: number
  quantidade: number
  custoMaterial: number
  custoEnergia: number
  custoDepreciacao: number
  custoProducaoUnitario: number
  custoProducaoTotal: number
  custosFilamentos: { tipo: string; cor: string; custo: number }[]
}

export interface ResultadoPrecificacao {
  custoAposFalha: number
  precoComMargem: number
  precoAntesTaxa: number
  precoVenda: number
  precoFinal: number
  lucroEfetivo: number
  margemEfetiva: number
  precoUnitario: number
  precoTotal: number
}

export interface ResultadoItemCompleto extends ResultadoPeca, ResultadoPrecificacao {}

export interface TotaisOrcamento {
  custoSubtotal: number
  precoTotal: number
}

export function tempoHorasTotal(horas: number, minutos: number) {
  return horas + minutos / 60
}

export function custoMaterialFilamento(precoPorKg: number, pesoG: number) {
  return (precoPorKg / 1000) * pesoG
}

export function custoComposicaoLinha(linha: ComposicaoLinha) {
  if (linha.categoria === 'filamento' && linha.pesoG != null) {
    return linha.custoUnitario * linha.pesoG
  }
  return linha.custoUnitario * linha.quantidade
}

export function pecaParaComposicao(peca: PecaCalculo): ComposicaoLinha[] {
  const linhas: ComposicaoLinha[] = peca.filamentos.map((f) => ({
    materialId: f.materialId,
    categoria: 'filamento',
    descricao: `${f.tipo} ${f.cor}`.trim(),
    tipo: f.tipo,
    cor: f.cor,
    quantidade: f.pesoG,
    unidadeMedida: 'gr',
    custoUnitario: f.precoPorKg / 1000,
    pesoG: f.pesoG,
  }))
  for (const ins of peca.insumos ?? []) {
    linhas.push({
      materialId: ins.materialId,
      categoria: ins.categoria ?? 'insumo',
      descricao: ins.nome,
      tipo: ins.nome,
      quantidade: ins.quantidade,
      unidadeMedida: ins.unidadeMedida ?? 'un',
      custoUnitario: ins.custoUnitario,
    })
  }
  return linhas
}

export function composicaoParaPeca(
  nomePeca: string,
  tempoHoras: number,
  tempoMinutos: number,
  quantidade: number,
  observacoes: string,
  composicao: ComposicaoLinha[],
): PecaCalculo {
  const filamentos: FilamentoPeca[] = composicao
    .filter((c) => c.categoria === 'filamento')
    .map((c) => ({
      materialId: c.materialId,
      tipo: c.tipo ?? '',
      cor: c.cor ?? '',
      precoPorKg: c.custoUnitario * 1000,
      pesoG: c.pesoG ?? c.quantidade,
    }))
  const insumos: InsumoPeca[] = composicao
    .filter((c) => c.categoria !== 'filamento')
    .map((c) => ({
      materialId: c.materialId,
      nome: c.descricao ?? c.tipo ?? '',
      quantidade: c.quantidade,
      custoUnitario: c.custoUnitario,
      categoria: c.categoria,
      unidadeMedida: c.unidadeMedida,
    }))
  return {
    nomePeca,
    tempoHoras,
    tempoMinutos,
    quantidade,
    observacoes,
    filamentos: filamentos.length > 0 ? filamentos : [],
    insumos,
  }
}

export function calcularCustosBrutosPeca(
  config: ConfigSnapshot,
  peca: PecaCalculo,
): ResultadoPeca {
  const tempo = tempoHorasTotal(peca.tempoHoras, peca.tempoMinutos)
  const quantidade = Math.max(1, peca.quantidade || 1)

  const custosFilamentos = peca.filamentos.map((f) => ({
    tipo: f.tipo,
    cor: f.cor,
    custo: custoMaterialFilamento(f.precoPorKg, f.pesoG),
  }))
  const custoFilamentos = custosFilamentos.reduce((s, f) => s + f.custo, 0)
  const custoInsumos = (peca.insumos ?? []).reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)
  const custoMaterial = custoFilamentos + custoInsumos
  const custoEnergia = config.consumoKwh * config.precoKwh * tempo
  const custoDepreciacao =
    config.vidaUtilHoras > 0 ? (config.valorMaquina / config.vidaUtilHoras) * tempo : 0
  const custoProducaoUnitario = custoMaterial + custoEnergia + custoDepreciacao
  const custoProducaoTotal = custoProducaoUnitario * quantidade
  const pesoTotalG = peca.filamentos.reduce((s, f) => s + f.pesoG, 0)

  return {
    pesoTotalG,
    quantidade,
    custoMaterial,
    custoEnergia,
    custoDepreciacao,
    custoProducaoUnitario,
    custoProducaoTotal,
    custosFilamentos,
  }
}

/** @deprecated use calcularCustosBrutosPeca */
export function calcularPeca(config: ConfigSnapshot, peca: PecaCalculo): ResultadoPeca {
  return calcularCustosBrutosPeca(config, peca)
}

export function aplicarPrecificacaoItem(
  custoProducaoTotal: number,
  quantidade: number,
  opts: {
    tipoItem: TipoItemOrcamento
    aplicarMargem: boolean
  } & ParamsMargemItem,
): ResultadoPrecificacao {
  const qtd = Math.max(1, quantidade || 1)

  if (!opts.aplicarMargem) {
    const precoFinal = custoProducaoTotal
    return {
      custoAposFalha: custoProducaoTotal,
      precoComMargem: custoProducaoTotal,
      precoAntesTaxa: custoProducaoTotal,
      precoVenda: custoProducaoTotal,
      precoFinal,
      lucroEfetivo: 0,
      margemEfetiva: 0,
      precoUnitario: precoFinal / qtd,
      precoTotal: precoFinal,
    }
  }

  const custoAposFalha =
    opts.tipoItem === 'peca'
      ? custoProducaoTotal * (1 + (opts.taxaFalha || 0))
      : custoProducaoTotal

  const precoComMargem = custoAposFalha * (opts.margemMultiplicador || 1)
  const precoAntesTaxa = precoComMargem + (opts.adicional || 0)
  const taxa = Math.min(Math.max(opts.taxaMarketplace || 0, 0), 0.95)
  const precoVenda = taxa > 0 ? precoAntesTaxa / (1 - taxa) : precoAntesTaxa
  const precoFinal = Math.max(0, precoVenda - (opts.desconto || 0))
  const lucroEfetivo = precoFinal - custoProducaoTotal
  const margemEfetiva = custoProducaoTotal > 0 ? lucroEfetivo / custoProducaoTotal : 0

  return {
    custoAposFalha,
    precoComMargem,
    precoAntesTaxa,
    precoVenda,
    precoFinal,
    lucroEfetivo,
    margemEfetiva,
    precoUnitario: precoFinal / qtd,
    precoTotal: precoFinal,
  }
}

export function calcularItemPeca(
  config: ConfigSnapshot,
  peca: PecaCalculo,
  params: ParamsMargemItem,
): ResultadoItemCompleto {
  const brutos = calcularCustosBrutosPeca(config, peca)
  const precificacao = aplicarPrecificacaoItem(brutos.custoProducaoTotal, brutos.quantidade, {
    tipoItem: 'peca',
    aplicarMargem: true,
    ...params,
  })
  return { ...brutos, ...precificacao }
}

export function calcularCustoAvulso(avulso: AvulsoCalculo) {
  const qtd = Math.max(1, avulso.quantidade || 1)
  return qtd * (avulso.custoUnitario || 0)
}

export function calcularItemAvulso(
  avulso: AvulsoCalculo,
  params: ParamsMargemItem,
): ResultadoPrecificacao & { custoProducaoTotal: number; quantidade: number } {
  const quantidade = Math.max(1, avulso.quantidade || 1)
  const custoProducaoTotal = calcularCustoAvulso(avulso)
  const precificacao = aplicarPrecificacaoItem(custoProducaoTotal, quantidade, {
    tipoItem: 'avulso',
    aplicarMargem: avulso.aplicarMargem,
    ...params,
  })
  return { custoProducaoTotal, quantidade, ...precificacao }
}

export function calcularTotaisOrcamento(
  itens: { custoProducaoTotal: number; precoFinal: number }[],
): TotaisOrcamento {
  return {
    custoSubtotal: itens.reduce((s, i) => s + i.custoProducaoTotal, 0),
    precoTotal: itens.reduce((s, i) => s + i.precoFinal, 0),
  }
}

export function paramsMargemDeConfig(config: ConfigOperacional): ParamsMargemItem {
  return {
    taxaFalha: config.taxaFalha,
    margemMultiplicador: config.margemMultiplicador,
    taxaMarketplace: config.taxaMarketplace,
    adicional: 0,
    desconto: 0,
  }
}

export function configSnapshotDeConfig(config: ConfigOperacional): ConfigSnapshot {
  return {
    consumoKwh: config.consumoKwh,
    precoKwh: config.precoKwh,
    valorMaquina: config.valorMaquina,
    vidaUtilHoras: config.vidaUtilHoras,
  }
}

export function formatarMoeda(valor: number) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return 'R$ 0,00'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarPercentual(valor: number) {
  return `${(valor * 100).toFixed(1)}%`
}

export function configOperacionalPadrao(): ConfigOperacional {
  return {
    consumoKwh: 0.15,
    precoKwh: 0.85,
    valorMaquina: 3500,
    vidaUtilHoras: 5000,
    margemMultiplicador: 2.5,
    taxaFalha: 0.15,
    taxaMarketplace: 0,
  }
}

export function configDeImpressora(c: {
  consumoKwh: number | string
  precoKwh: number | string
  valorMaquina: number | string
  vidaUtilHoras: number | string
  margemMultiplicador: number | string
  taxaFalha: number | string
  taxaMarketplace: number | string
}): ConfigOperacional {
  return {
    consumoKwh: Number(c.consumoKwh),
    precoKwh: Number(c.precoKwh),
    valorMaquina: Number(c.valorMaquina),
    vidaUtilHoras: Number(c.vidaUtilHoras),
    margemMultiplicador: Number(c.margemMultiplicador),
    taxaFalha: Number(c.taxaFalha),
    taxaMarketplace: Number(c.taxaMarketplace),
  }
}

export function avulsoVazio(): AvulsoCalculo {
  return {
    nome: '',
    quantidade: 1,
    custoUnitario: 0,
    aplicarMargem: true,
    ehFrete: false,
    observacoes: '',
  }
}

export function paramsMargemVazio(): ParamsMargemItem {
  const padrao = configOperacionalPadrao()
  return paramsMargemDeConfig(padrao)
}
