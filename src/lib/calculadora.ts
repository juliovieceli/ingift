export interface ConfigOperacional {
  consumoKwh: number
  precoKwh: number
  valorMaquina: number
  vidaUtilHoras: number
  margemMultiplicador: number
  taxaFalha: number
  taxaMarketplace: number
  custoEmbalagem: number
  custoFrete: number
  custoAcabamento: number
  outrosFixos: number
}

export interface FilamentoPeca {
  tipo: string
  cor: string
  precoPorKg: number
  pesoG: number
  materialId?: string
}

export interface InsumoPeca {
  materialId?: string
  nome: string
  quantidade: number
  custoUnitario: number
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

export interface ResultadoPeca {
  pesoTotalG: number
  custoMaterial: number
  custoEnergia: number
  custoDepreciacao: number
  precoUnitario: number
  precoTotal: number
  custosFilamentos: { tipo: string; cor: string; custo: number }[]
}

export function tempoHorasTotal(horas: number, minutos: number) {
  return horas + minutos / 60
}

export function calcularPeca(config: ConfigOperacional, peca: PecaCalculo): ResultadoPeca {
  const tempo = tempoHorasTotal(peca.tempoHoras, peca.tempoMinutos)
  const custosFilamentos = peca.filamentos.map((f) => ({
    tipo: f.tipo,
    cor: f.cor,
    custo: (f.pesoG / 1000) * f.precoPorKg,
  }))
  const custoFilamentos = custosFilamentos.reduce((s, f) => s + f.custo, 0)
  const custoInsumos = (peca.insumos ?? []).reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)
  const custoMaterial = custoFilamentos + custoInsumos
  const custoEnergia = tempo * config.consumoKwh * config.precoKwh
  const custoDepreciacao = tempo * (config.valorMaquina / config.vidaUtilHoras)
  const subtotalCustos = custoMaterial + custoEnergia + custoDepreciacao
  const subtotalComFalha = subtotalCustos * (1 + config.taxaFalha)
  const subtotalComMarketplace = subtotalComFalha * (1 + config.taxaMarketplace)
  const precoUnitario =
    subtotalComMarketplace * config.margemMultiplicador +
    config.custoEmbalagem +
    config.custoFrete +
    config.custoAcabamento +
    config.outrosFixos
  const pesoTotalG = peca.filamentos.reduce((s, f) => s + f.pesoG, 0)

  return {
    pesoTotalG,
    custoMaterial,
    custoEnergia,
    custoDepreciacao,
    precoUnitario,
    precoTotal: precoUnitario * peca.quantidade,
    custosFilamentos,
  }
}

export interface PecaSessao {
  id: string
  peca: PecaCalculo
  resultado: ResultadoPeca
}

export function agregarResultados(pecas: ResultadoPeca[]) {
  return pecas.reduce(
    (acc, r) => ({
      custoMaterial: acc.custoMaterial + r.custoMaterial,
      custoEnergia: acc.custoEnergia + r.custoEnergia,
      custoDepreciacao: acc.custoDepreciacao + r.custoDepreciacao,
      precoTotal: acc.precoTotal + r.precoTotal,
      pesoTotalG: acc.pesoTotalG + r.pesoTotalG,
    }),
    { custoMaterial: 0, custoEnergia: 0, custoDepreciacao: 0, precoTotal: 0, pesoTotalG: 0 }
  )
}

export function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
    custoEmbalagem: 0,
    custoFrete: 0,
    custoAcabamento: 0,
    outrosFixos: 0,
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
  custoEmbalagem: number | string
  custoFrete: number | string
  custoAcabamento: number | string
  outrosFixos: number | string
}): ConfigOperacional {
  return {
    consumoKwh: Number(c.consumoKwh),
    precoKwh: Number(c.precoKwh),
    valorMaquina: Number(c.valorMaquina),
    vidaUtilHoras: Number(c.vidaUtilHoras),
    margemMultiplicador: Number(c.margemMultiplicador),
    taxaFalha: Number(c.taxaFalha),
    taxaMarketplace: Number(c.taxaMarketplace),
    custoEmbalagem: Number(c.custoEmbalagem),
    custoFrete: Number(c.custoFrete),
    custoAcabamento: Number(c.custoAcabamento),
    outrosFixos: Number(c.outrosFixos),
  }
}

export function configDeDadosCalculo(d: {
  dadosImpressora?: Record<string, number>
  dadosMargensTaxas?: Record<string, number>
  dadosLogistica?: Record<string, number>
}): ConfigOperacional {
  const padrao = configOperacionalPadrao()
  const imp = d.dadosImpressora ?? {}
  const marg = d.dadosMargensTaxas ?? {}
  const log = d.dadosLogistica ?? {}
  return {
    consumoKwh: imp.consumoKwh ?? padrao.consumoKwh,
    precoKwh: imp.precoKwh ?? padrao.precoKwh,
    valorMaquina: imp.valorMaquina ?? padrao.valorMaquina,
    vidaUtilHoras: imp.vidaUtilHoras ?? padrao.vidaUtilHoras,
    margemMultiplicador: marg.margemMultiplicador ?? padrao.margemMultiplicador,
    taxaFalha: marg.taxaFalha ?? padrao.taxaFalha,
    taxaMarketplace: marg.taxaMarketplace ?? padrao.taxaMarketplace,
    custoEmbalagem: log.custoEmbalagem ?? padrao.custoEmbalagem,
    custoFrete: log.custoFrete ?? padrao.custoFrete,
    custoAcabamento: log.custoAcabamento ?? padrao.custoAcabamento,
    outrosFixos: log.outrosFixos ?? padrao.outrosFixos,
  }
}
