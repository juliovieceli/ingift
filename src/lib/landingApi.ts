import type { PortfolioGrupo, PortfolioItemComGrupos } from '@/tipos/database'
import { supabase } from '@/lib/supabase'

export type PortfolioGrupoLanding = Pick<PortfolioGrupo, 'id' | 'nome' | 'descricao' | 'urlsImagem' | 'ordem'>
export type PortfolioItemLanding = Pick<PortfolioItemComGrupos, 'id' | 'titulo' | 'descricao' | 'urlsImagem' | 'urlLoja' | 'grupoIds' | 'ordem'>

export interface DadosLanding {
  secoes: Pick<import('@/tipos/database').SecaoLanding, 'slug' | 'titulo' | 'conteudo' | 'ordem'>[]
  portfolioGrupos: PortfolioGrupoLanding[]
  portfolio: PortfolioItemLanding[]
}

function urlLandingApi(): string | null {
  const direta = import.meta.env.VITE_LANDING_API_URL
  if (direta) return direta.replace(/\/$/, '')

  const base = import.meta.env.VITE_SUPABASE_URL
  if (base) return `${base.replace(/\/$/, '')}/functions/v1/landing`

  return null
}

async function buscarViaEdgeFunction(): Promise<DadosLanding | null> {
  const url = urlLandingApi()
  if (!url) return null

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const dados = (await res.json()) as DadosLanding & { erro?: string }
    if (dados.erro || !Array.isArray(dados.secoes) || !Array.isArray(dados.portfolio)) return null
    return {
      secoes: dados.secoes,
      portfolioGrupos: Array.isArray(dados.portfolioGrupos) ? dados.portfolioGrupos : [],
      portfolio: dados.portfolio,
    }
  } catch {
    return null
  }
}

async function buscarViaSupabase(): Promise<DadosLanding | null> {
  if (!supabase) return null

  const [secoesRes, gruposRes, portfolioRes] = await Promise.all([
    supabase.from('SecaoLandingPublica').select('slug, titulo, conteudo, ordem').order('ordem'),
    supabase.from('PortfolioGrupoPublico').select('id, nome, descricao, urlsImagem, ordem').order('ordem'),
    supabase.from('PortfolioItemPublico').select('id, titulo, descricao, urlsImagem, urlLoja, grupoIds, ordem').order('ordem'),
  ])

  if (secoesRes.error || gruposRes.error || portfolioRes.error) return null

  return {
    secoes: (secoesRes.data ?? []) as DadosLanding['secoes'],
    portfolioGrupos: (gruposRes.data ?? []) as DadosLanding['portfolioGrupos'],
    portfolio: (portfolioRes.data ?? []) as DadosLanding['portfolio'],
  }
}

export async function buscarDadosLanding(): Promise<DadosLanding | null> {
  const viaEdge = await buscarViaEdgeFunction()
  if (viaEdge?.secoes.length) return viaEdge

  return buscarViaSupabase()
}
