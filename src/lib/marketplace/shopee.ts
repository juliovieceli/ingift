/**
 * Taxas Shopee BR para vendedores CNPJ (2026).
 * Fonte: https://seller.br.shopee.cn/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026
 * Sempre CNPJ — não há suporte a tabelas CPF neste módulo.
 */

export interface FaixaComissaoShopee {
  min: number
  max: number
  percentual: number
  taxaFixa: number
  /** Fração do valor do anúncio (0, 0.05 ou 0.08). */
  subsidioPix: number
}

export interface DetalhePagamentoShopee {
  comissao: number
  liquido: number
  valorNota: number
  subsidio: number
}

export interface ResultadoTaxasShopee {
  precoAnuncio: number
  faixa: FaixaComissaoShopee
  cartaoBoleto: DetalhePagamentoShopee
  pix: DetalhePagamentoShopee
}

/** Tabela oficial CNPJ 2026 — valor do item. */
export const FAIXAS_COMISSAO_CNPJ_2026: readonly FaixaComissaoShopee[] = [
  { min: 0, max: 79.99, percentual: 0.2, taxaFixa: 4, subsidioPix: 0 },
  { min: 80, max: 99.99, percentual: 0.14, taxaFixa: 16, subsidioPix: 0.05 },
  { min: 100, max: 199.99, percentual: 0.14, taxaFixa: 20, subsidioPix: 0.05 },
  { min: 200, max: 499.99, percentual: 0.14, taxaFixa: 26, subsidioPix: 0.05 },
  { min: 500, max: Number.POSITIVE_INFINITY, percentual: 0.14, taxaFixa: 26, subsidioPix: 0.08 },
]

export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function faixaComissaoShopee(precoAnuncio: number): FaixaComissaoShopee | null {
  if (!Number.isFinite(precoAnuncio) || precoAnuncio < 0) return null
  return FAIXAS_COMISSAO_CNPJ_2026.find((f) => precoAnuncio >= f.min && precoAnuncio <= f.max) ?? null
}

function comissaoNaFaixa(precoAnuncio: number, faixa: FaixaComissaoShopee): number {
  return arredondarMoeda(precoAnuncio * faixa.percentual + faixa.taxaFixa)
}

function liquidoNaFaixa(precoAnuncio: number, faixa: FaixaComissaoShopee): number {
  return arredondarMoeda(precoAnuncio - comissaoNaFaixa(precoAnuncio, faixa))
}

/** Líquido do vendedor a partir do preço de anúncio (cartão/boleto ou Pix — mesmo valor). */
export function liquidoShopee(precoAnuncio: number): number {
  const faixa = faixaComissaoShopee(precoAnuncio)
  if (!faixa) {
    throw new Error(`Preço de anúncio inválido para faixas Shopee CNPJ: ${precoAnuncio}`)
  }
  return liquidoNaFaixa(precoAnuncio, faixa)
}

function detalheCartaoBoleto(precoAnuncio: number, faixa: FaixaComissaoShopee): DetalhePagamentoShopee {
  const comissao = comissaoNaFaixa(precoAnuncio, faixa)
  return {
    comissao,
    liquido: arredondarMoeda(precoAnuncio - comissao),
    valorNota: precoAnuncio,
    subsidio: 0,
  }
}

function detalhePix(precoAnuncio: number, faixa: FaixaComissaoShopee): DetalhePagamentoShopee {
  const cartao = detalheCartaoBoleto(precoAnuncio, faixa)
  const subsidio = arredondarMoeda(precoAnuncio * faixa.subsidioPix)
  return {
    comissao: arredondarMoeda(cartao.comissao - subsidio),
    liquido: cartao.liquido,
    valorNota: arredondarMoeda(precoAnuncio - subsidio),
    subsidio,
  }
}

function precoCandidatoNaFaixa(liquidoDesejado: number, faixa: FaixaComissaoShopee): number | null {
  const bruto = (liquidoDesejado + faixa.taxaFixa) / (1 - faixa.percentual)
  if (!Number.isFinite(bruto) || bruto <= 0) return null

  let preco = arredondarMoeda(bruto)

  // Arredondamento pode empurrar para fora da faixa; tenta manter o bruto se ainda couber.
  if (preco < faixa.min || preco > faixa.max) {
    if (bruto >= faixa.min && bruto <= faixa.max) {
      preco = arredondarMoeda(Math.min(faixa.max, Math.max(faixa.min, bruto)))
    } else if (bruto < faixa.min && liquidoNaFaixa(faixa.min, faixa) + 0.005 >= liquidoDesejado) {
      // Cliff: o inverso cai abaixo do piso, mas o piso da faixa ainda cobre o líquido.
      preco = arredondarMoeda(faixa.min)
    } else {
      return null
    }
  }

  if (preco < faixa.min || preco > faixa.max) return null
  if (liquidoNaFaixa(preco, faixa) + 0.005 < liquidoDesejado) return null
  return preco
}

/**
 * Calcula o preço de anúncio Shopee (CNPJ) para receber `liquidoDesejado` após comissão.
 * Retorna detalhe cartão/boleto e Pix (mesmo líquido; Pix altera NF e comissão exibida).
 */
export function calcularTaxasShopee(liquidoDesejado: number): ResultadoTaxasShopee {
  if (!Number.isFinite(liquidoDesejado) || liquidoDesejado < 0) {
    throw new Error(`Líquido desejado inválido: ${liquidoDesejado}`)
  }

  const candidatos: { preco: number; faixa: FaixaComissaoShopee }[] = []

  for (const faixa of FAIXAS_COMISSAO_CNPJ_2026) {
    const preco = precoCandidatoNaFaixa(liquidoDesejado, faixa)
    if (preco != null) candidatos.push({ preco, faixa })
  }

  if (candidatos.length === 0) {
    throw new Error(`Não foi possível calcular preço Shopee para líquido ${liquidoDesejado}`)
  }

  candidatos.sort((a, b) => a.preco - b.preco)
  const escolhido = candidatos[0]
  const precoAnuncio = escolhido.preco
  const faixa = escolhido.faixa

  return {
    precoAnuncio,
    faixa,
    cartaoBoleto: detalheCartaoBoleto(precoAnuncio, faixa),
    pix: detalhePix(precoAnuncio, faixa),
  }
}
