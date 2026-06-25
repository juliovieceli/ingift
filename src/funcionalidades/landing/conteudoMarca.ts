export type ConteudoMarca = {
  urlLogo: string
  nomeMarca: string
  exibirLogoHero: boolean
}

export const MARCA_PADRAO: ConteudoMarca = {
  urlLogo: '/marca/sublogo.png',
  nomeMarca: 'InGift',
  exibirLogoHero: false,
}

export function parseConteudoMarca(conteudo: unknown): ConteudoMarca {
  const c = (conteudo && typeof conteudo === 'object' ? conteudo : {}) as Record<string, unknown>
  return {
    urlLogo: String(c.urlLogo ?? MARCA_PADRAO.urlLogo).trim() || MARCA_PADRAO.urlLogo,
    nomeMarca: String(c.nomeMarca ?? MARCA_PADRAO.nomeMarca).trim() || MARCA_PADRAO.nomeMarca,
    exibirLogoHero: c.exibirLogoHero === true,
  }
}
