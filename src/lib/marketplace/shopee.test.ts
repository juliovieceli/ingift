import { describe, expect, it } from 'vitest'
import {
  calcularTaxasShopee,
  faixaComissaoShopee,
  liquidoShopee,
} from './shopee'

describe('liquidoShopee / faixaComissaoShopee', () => {
  it('faixa até 79,99: 15 → líquido 8 (20% + R$4)', () => {
    expect(faixaComissaoShopee(15)?.percentual).toBe(0.2)
    expect(liquidoShopee(15)).toBe(8)
  })

  it('faixa ≥500: 500 → comissão 96 e líquido 404', () => {
    expect(faixaComissaoShopee(500)?.taxaFixa).toBe(26)
    expect(faixaComissaoShopee(500)?.subsidioPix).toBe(0.08)
    expect(liquidoShopee(500)).toBe(404)
  })
})

describe('calcularTaxasShopee (CNPJ)', () => {
  it('inverte líquido 8 → anúncio 15 na faixa ≤79,99', () => {
    const r = calcularTaxasShopee(8)
    expect(r.precoAnuncio).toBe(15)
    expect(r.cartaoBoleto.comissao).toBe(7)
    expect(r.cartaoBoleto.liquido).toBe(8)
    expect(r.pix.subsidio).toBe(0)
    expect(r.pix.liquido).toBe(8)
    expect(r.pix.valorNota).toBe(15)
  })

  it('exemplo oficial R$500: cartão e Pix com mesmo líquido', () => {
    const r = calcularTaxasShopee(404)
    expect(r.precoAnuncio).toBe(500)
    expect(r.cartaoBoleto.comissao).toBe(96)
    expect(r.cartaoBoleto.valorNota).toBe(500)
    expect(r.cartaoBoleto.liquido).toBe(404)
    expect(r.pix.subsidio).toBe(40)
    expect(r.pix.comissao).toBe(56)
    expect(r.pix.valorNota).toBe(460)
    expect(r.pix.liquido).toBe(404)
  })

  it('cruza teto da faixa ≤79,99 e usa a faixa seguinte', () => {
    // Máximo líquido na 1ª faixa (~59,99). 60 força 14% + R$16.
    const r = calcularTaxasShopee(60)
    expect(r.precoAnuncio).toBeGreaterThanOrEqual(80)
    expect(r.precoAnuncio).toBeLessThanOrEqual(99.99)
    expect(r.faixa.percentual).toBe(0.14)
    expect(r.faixa.taxaFixa).toBe(16)
    expect(r.cartaoBoleto.liquido).toBeGreaterThanOrEqual(60)
    expect(liquidoShopee(r.precoAnuncio)).toBe(r.cartaoBoleto.liquido)
  })

  it('round-trip: líquidoShopee(precoAnuncio) ≈ líquido desejado', () => {
    for (const liquido of [8, 40, 60, 100, 200, 404, 600]) {
      const r = calcularTaxasShopee(liquido)
      expect(liquidoShopee(r.precoAnuncio)).toBeGreaterThanOrEqual(liquido - 0.01)
      expect(r.cartaoBoleto.liquido).toBe(r.pix.liquido)
    }
  })
})
