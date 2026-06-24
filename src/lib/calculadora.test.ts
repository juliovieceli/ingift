import { describe, expect, it } from 'vitest'
import {
  aplicarPrecificacaoItem,
  calcularCustoAvulso,
  calcularCustosBrutosPeca,
  calcularItemAvulso,
  calcularItemPeca,
  calcularTotaisOrcamento,
  configOperacionalPadrao,
  paramsMargemDeConfig,
} from './calculadora'

const config = configOperacionalPadrao()
const params = paramsMargemDeConfig(config)

describe('calcularCustosBrutosPeca', () => {
  it('soma material, energia e depreciação por quantidade', () => {
    const r = calcularCustosBrutosPeca(config, {
      nomePeca: 'Teste',
      tempoHoras: 2,
      tempoMinutos: 0,
      quantidade: 2,
      observacoes: '',
      filamentos: [{ materialId: 'm1', tipo: 'PLA', cor: 'preto', precoPorKg: 100, pesoG: 50 }],
      insumos: [],
    })
    expect(r.custoMaterial).toBe(5)
    expect(r.custoEnergia).toBeCloseTo(0.255)
    expect(r.custoProducaoTotal).toBeCloseTo((5 + 0.255 + 1.4) * 2, 1)
  })
})

describe('aplicarPrecificacaoItem', () => {
  it('aplica margem, adicional após margem, marketplace e desconto', () => {
    const r = aplicarPrecificacaoItem(10, 1, {
      tipoItem: 'peca',
      aplicarMargem: true,
      taxaFalha: 0,
      margemMultiplicador: 2,
      taxaMarketplace: 0,
      adicional: 5,
      desconto: 2,
    })
    expect(r.precoComMargem).toBe(20)
    expect(r.precoAntesTaxa).toBe(25)
    expect(r.precoVenda).toBe(25)
    expect(r.precoFinal).toBe(23)
    expect(r.lucroEfetivo).toBe(13)
    expect(r.margemEfetiva).toBeCloseTo(1.3)
  })

  it('repasse direto sem margem', () => {
    const r = aplicarPrecificacaoItem(15, 1, {
      tipoItem: 'avulso',
      aplicarMargem: false,
      taxaFalha: 0,
      margemMultiplicador: 2,
      taxaMarketplace: 0,
      adicional: 0,
      desconto: 0,
    })
    expect(r.precoFinal).toBe(15)
    expect(r.lucroEfetivo).toBe(0)
  })
})

describe('calcularItemPeca', () => {
  it('integra custos e precificação com taxa de falha', () => {
    const r = calcularItemPeca(
      config,
      {
        nomePeca: 'Chaveiro',
        tempoHoras: 1,
        tempoMinutos: 0,
        quantidade: 1,
        observacoes: '',
        filamentos: [{ materialId: 'm1', tipo: 'PLA', cor: '', precoPorKg: 80, pesoG: 10 }],
        insumos: [],
      },
      { ...params, desconto: 0 },
    )
    expect(r.custoProducaoTotal).toBeGreaterThan(0)
    expect(r.precoFinal).toBeGreaterThan(r.custoProducaoTotal)
    expect(r.lucroEfetivo).toBeGreaterThan(0)
  })
})

describe('calcularItemAvulso', () => {
  it('calcula frete com margem', () => {
    const r = calcularItemAvulso(
      { nome: 'Frete', quantidade: 1, custoUnitario: 20, aplicarMargem: true },
      params,
    )
    expect(r.custoProducaoTotal).toBe(20)
    expect(r.precoFinal).toBeGreaterThan(20)
  })

  it('repassa frete sem margem', () => {
    const r = calcularItemAvulso(
      { nome: 'Frete', quantidade: 1, custoUnitario: 20, aplicarMargem: false },
      params,
    )
    expect(r.precoFinal).toBe(20)
  })
})

describe('calcularTotaisOrcamento', () => {
  it('soma custos e preços finais dos itens', () => {
    const t = calcularTotaisOrcamento([
      { custoProducaoTotal: 10, precoFinal: 25 },
      { custoProducaoTotal: 5, precoFinal: 12 },
    ])
    expect(t.custoSubtotal).toBe(15)
    expect(t.precoTotal).toBe(37)
  })
})

describe('calcularCustoAvulso', () => {
  it('multiplica quantidade pelo custo unitário', () => {
    expect(calcularCustoAvulso({ nome: 'Caixa', quantidade: 3, custoUnitario: 4, aplicarMargem: true })).toBe(12)
  })
})
