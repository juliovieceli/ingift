import type { PortfolioItem, SecaoLanding } from '@/tipos/database'

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

export async function buscarDadosLanding(): Promise<DadosLanding | null> {
  const url = urlLandingApi()
  if (!url) return null

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const dados = (await res.json()) as DadosLanding
    if (!Array.isArray(dados.secoes) || !Array.isArray(dados.portfolio)) return null
    return dados
  } catch {
    return null
  }
}
