import type { PortfolioItem, SecaoLanding } from '@/tipos/database'
import { supabase } from '@/lib/supabase'

export interface DadosLanding {
  secoes: Pick<SecaoLanding, 'slug' | 'titulo' | 'conteudo' | 'ordem'>[]
  portfolio: Pick<PortfolioItem, 'id' | 'titulo' | 'descricao' | 'urlImagem' | 'ordem'>[]
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
    return dados
  } catch {
    return null
  }
}

async function buscarViaSupabase(): Promise<DadosLanding | null> {
  if (!supabase) return null

  const [secoesRes, portfolioRes] = await Promise.all([
    supabase.from('SecaoLandingPublica').select('slug, titulo, conteudo, ordem').order('ordem'),
    supabase.from('PortfolioItemPublico').select('id, titulo, descricao, urlImagem, ordem').order('ordem'),
  ])

  if (secoesRes.error || portfolioRes.error) return null

  return {
    secoes: (secoesRes.data ?? []) as DadosLanding['secoes'],
    portfolio: (portfolioRes.data ?? []) as DadosLanding['portfolio'],
  }
}

export async function buscarDadosLanding(): Promise<DadosLanding | null> {
  const viaEdge = await buscarViaEdgeFunction()
  if (viaEdge?.secoes.length) return viaEdge

  return buscarViaSupabase()
}
