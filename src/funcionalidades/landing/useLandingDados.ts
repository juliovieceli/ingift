import { buscarDadosLanding } from '@/lib/landingApi'
import { parseConteudo } from '@/lib/parseConteudo'
import type { PortfolioGrupo, PortfolioItem, SecaoLanding } from '@/tipos/database'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ContatoLanding } from './contatoLanding'
import { portfolioFallback, portfolioGruposFallback, secoesFallback } from './dadosFallback'

/** Tempo máximo de splash antes de exibir conteúdo padrão (ms) */
export const LANDING_TIMEOUT_FALLBACK_MS = 3500

const agora = () => new Date().toISOString()

type DadosLandingNormalizados = {
  secoes: SecaoLanding[]
  portfolioGrupos: PortfolioGrupo[]
  portfolio: PortfolioItem[]
}

const dadosFallbackNormalizados: DadosLandingNormalizados = {
  secoes: secoesFallback,
  portfolioGrupos: portfolioGruposFallback,
  portfolio: portfolioFallback,
}

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

function normalizarPortfolioGrupos(
  grupos: { id: string; nome: string; descricao: string | null; urlImagem: string | null; ordem: number }[],
): PortfolioGrupo[] {
  const ts = agora()
  return grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    descricao: g.descricao,
    urlImagem: g.urlImagem,
    publicado: true,
    ordem: g.ordem,
    criadoEm: ts,
    atualizadoEm: ts,
    criadoPor: null,
    atualizadoPor: null,
  }))
}

function normalizarPortfolio(
  itens: { id: string; titulo: string; descricao: string | null; urlImagem: string; urlLoja: string | null; grupoId: string | null; ordem: number }[],
): PortfolioItem[] {
  const ts = agora()
  return itens.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    urlImagem: p.urlImagem,
    urlLoja: p.urlLoja,
    grupoId: p.grupoId,
    publicado: true,
    ordem: p.ordem,
    criadoEm: ts,
    atualizadoEm: ts,
    criadoPor: null,
    atualizadoPor: null,
  }))
}

export function useLandingDados() {
  const [timeoutFallback, setTimeoutFallback] = useState(false)

  const landing = useQuery({
    queryKey: ['landing'],
    queryFn: async (): Promise<DadosLandingNormalizados> => {
      const dados = await buscarDadosLanding()
      if (!dados?.secoes.length) {
        return dadosFallbackNormalizados
      }

      return {
        secoes: normalizarSecoes(dados.secoes),
        portfolioGrupos: dados.portfolioGrupos.length
          ? normalizarPortfolioGrupos(dados.portfolioGrupos)
          : portfolioGruposFallback,
        portfolio: dados.portfolio.length
          ? normalizarPortfolio(dados.portfolio)
          : portfolioFallback,
      }
    },
  })

  useEffect(() => {
    if (landing.isSuccess) return
    const id = window.setTimeout(() => setTimeoutFallback(true), LANDING_TIMEOUT_FALLBACK_MS)
    return () => window.clearTimeout(id)
  }, [landing.isSuccess])

  const carregando = landing.isPending && !timeoutFallback

  const dados: DadosLandingNormalizados | undefined = landing.isSuccess
    ? landing.data
    : timeoutFallback
      ? dadosFallbackNormalizados
      : undefined

  const secao = (slug: string) => dados?.secoes.find((s) => s.slug === slug)

  const contato = (): ContatoLanding | undefined => {
    const raw = secao('contato')?.conteudo
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    return raw as ContatoLanding
  }

  return {
    carregando,
    secoes: { data: dados?.secoes, isLoading: carregando },
    portfolioGrupos: { data: dados?.portfolioGrupos, isLoading: carregando },
    portfolio: { data: dados?.portfolio, isLoading: carregando },
    secao,
    contato,
  }
}
