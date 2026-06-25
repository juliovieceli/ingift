export type ConteudoHero = {
  titulo?: string
  frasesRotativas?: string[]
  subtitulo?: string
  cta?: string
  ctaSecundario?: string
}

export const FRASES_ROTATIVAS_PADRAO = [
  'para sua empresa',
  'para presentes únicos',
  'para brindes corporativos',
  'para o seu projeto',
]

export const HERO_PADRAO: ConteudoHero = {
  titulo: 'Transformamos ideias em objetos reais',
  frasesRotativas: FRASES_ROTATIVAS_PADRAO,
  subtitulo: 'Transformamos suas ideias em objetos reais com qualidade e precisão',
  cta: 'Solicitar orçamento',
  ctaSecundario: 'Ver protifólio',
}

export function parseConteudoHero(conteudo: unknown): ConteudoHero {
  const c = (conteudo && typeof conteudo === 'object' ? conteudo : {}) as Record<string, unknown>
  const frases = Array.isArray(c.frasesRotativas)
    ? (c.frasesRotativas as string[]).filter(Boolean)
    : FRASES_ROTATIVAS_PADRAO

  return {
    titulo: String(c.titulo ?? HERO_PADRAO.titulo),
    frasesRotativas: frases.length > 0 ? frases : FRASES_ROTATIVAS_PADRAO,
    subtitulo: String(c.subtitulo ?? HERO_PADRAO.subtitulo),
    cta: String(c.cta ?? HERO_PADRAO.cta),
    ctaSecundario: String(c.ctaSecundario ?? HERO_PADRAO.ctaSecundario),
  }
}
