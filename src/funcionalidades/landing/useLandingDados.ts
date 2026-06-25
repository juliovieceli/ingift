import { buscarDadosLanding } from '@/lib/landingApi'
import { parseConteudo } from '@/lib/parseConteudo'
import type { PortfolioItem, SecaoLanding } from '@/tipos/database'
import { useQuery } from '@tanstack/react-query'
import type { ContatoLanding } from './contatoLanding'
import { portfolioFallback, secoesFallback } from './dadosFallback'

const agora = () => new Date().toISOString()

function normalizarSecoes(
  secoes: { slug: string; titulo: string; conteudo: SecaoLanding['conteudo']; ordem: number }[],
): SecaoLanding[] {
  return secoes.map((s) => ({
    id: s.slug,
    slug: s.slug,
    titulo: s.titulo,
    conteudo: parseConteudo(s.conteudo) as SecaoLanding['conteudo'],
    publicado: true,
    ordem: s.ordem,
    atualizadoEm: agora(),
    atualizadoPor: null,
  }))
}

function normalizarPortfolio(
  itens: { id: string; titulo: string; descricao: string | null; urlImagem: string; ordem: number }[],
): PortfolioItem[] {
  const ts = agora()
  return itens.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    urlImagem: p.urlImagem,
    publicado: true,
    ordem: p.ordem,
    criadoEm: ts,
    atualizadoEm: ts,
    criadoPor: null,
    atualizadoPor: null,
  }))
}

export function useLandingDados() {
  const landing = useQuery({
    queryKey: ['landing'],
    queryFn: async () => {
      const dados = await buscarDadosLanding()
      if (!dados?.secoes.length) {
        return { secoes: secoesFallback, portfolio: portfolioFallback }
      }

      console.log({secoes: dados.secoes})
      return {
        secoes: normalizarSecoes(dados.secoes),
        portfolio: dados.portfolio.length
          ? normalizarPortfolio(dados.portfolio)
          : portfolioFallback,
      }
    },
  })

  const secao = (slug: string) => landing.data?.secoes.find((s) => s.slug === slug)


  const contato = (): ContatoLanding | undefined => {
    const raw = secao('contato')?.conteudo
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    return raw as ContatoLanding
  }

  return {
    secoes: { data: landing.data?.secoes, isLoading: landing.isLoading },
    portfolio: { data: landing.data?.portfolio, isLoading: landing.isLoading },
    secao,
    contato,
  }
}
