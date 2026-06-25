export const NOMES_SECAO: Record<string, string> = {
  hero: 'Página inicial (Hero)',
  home: 'Página inicial (Hero)',
  marca: 'Marca / Logo',
  servicos: 'Serviços',
  portfolio: 'Portfólio',
  sobre: 'Sobre',
  contato: 'Contato',
}

export function normalizarSlug(slug: string) {
  return slug === 'home' ? 'hero' : slug
}

export function nomeSecaoCms(slug: string, titulo: string) {
  return NOMES_SECAO[slug] ?? NOMES_SECAO[normalizarSlug(slug)] ?? titulo
}
