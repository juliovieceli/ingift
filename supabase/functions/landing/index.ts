import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ erro: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const chave =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEYS')?.split(',')[0]?.trim()

  if (!url || !chave) {
    return new Response(JSON.stringify({ erro: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(url, chave, { auth: { persistSession: false } })

    const [secoesRes, gruposRes, portfolioRes] = await Promise.all([
      supabase
        .from('SecaoLanding')
        .select('slug, titulo, conteudo, ordem')
        .eq('publicado', true)
        .order('ordem'),
      supabase
        .from('PortfolioGrupo')
        .select('id, nome, descricao, urlsImagem, ordem')
        .eq('publicado', true)
        .order('ordem'),
      supabase
        .from('PortfolioItem')
        .select('id, titulo, descricao, urlsImagem, urlLoja, ordem, PortfolioItemGrupo(grupoId)')
        .eq('publicado', true)
        .order('ordem'),
    ])

    if (secoesRes.error) throw secoesRes.error
    if (gruposRes.error) throw gruposRes.error
    if (portfolioRes.error) throw portfolioRes.error

    type ItemComGrupos = {
      id: string
      titulo: string
      descricao: string | null
      urlsImagem: string[]
      urlLoja: string | null
      ordem: number
      PortfolioItemGrupo: { grupoId: string }[] | null
    }

    const portfolio = ((portfolioRes.data ?? []) as ItemComGrupos[]).map((item) => ({
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao,
      urlsImagem: item.urlsImagem,
      urlLoja: item.urlLoja,
      ordem: item.ordem,
      grupoIds: (item.PortfolioItemGrupo ?? []).map((g) => g.grupoId),
    }))

    return new Response(
      JSON.stringify({
        secoes: secoesRes.data ?? [],
        portfolioGrupos: gruposRes.data ?? [],
        portfolio,
      }),
      {
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      },
    )
  } catch {
    return new Response(JSON.stringify({ erro: 'Erro ao carregar conteúdo' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
