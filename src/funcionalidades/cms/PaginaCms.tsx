import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { ModalPortfolio } from '@/funcionalidades/cms/modais/ModalPortfolio'
import { ModalPortfolioGrupo } from '@/funcionalidades/cms/modais/ModalPortfolioGrupo'
import { ModalSecao } from '@/funcionalidades/cms/modais/ModalSecao'
import { NOMES_SECAO, normalizarSlug } from '@/funcionalidades/cms/secaoCms'
import { urlsImagemGrupo } from '@/funcionalidades/landing/portfolioGrupo'
import { parseConteudo } from '@/lib/parseConteudo'
import { parseConteudoServicos } from '@/funcionalidades/landing/conteudoServicos'
import { parseConteudoMarca } from '@/funcionalidades/landing/conteudoMarca'
import type { PortfolioGrupo, PortfolioItem, PortfolioItemComGrupos, SecaoLanding } from '@/tipos/database'

type Aba = 'secoes' | 'grupos' | 'portfolio'

function previewSecao(secao: SecaoLanding): string {
  const c = parseConteudo(secao.conteudo)
  const slug = normalizarSlug(secao.slug)
  if (slug === 'marca') {
    const m = parseConteudoMarca(c)
    return `${m.nomeMarca} — ${m.urlLogo}`
  }
  if (slug === 'servicos') {
    return parseConteudoServicos(c).map((i) => i.titulo).join(', ')
  }
  if (slug === 'sobre' && typeof c.texto === 'string') return c.texto
  if (slug === 'hero') {
    const frases = Array.isArray(c.frasesRotativas) ? (c.frasesRotativas as string[]).join(' · ') : ''
    return [c.titulo, frases].filter(Boolean).join(' — ')
  }
  if (slug === 'portfolio') {
    return String(c.subtitulo ?? '')
  }
  if (slug === 'contato') {
    const redes = ['instagram', 'tiktok', 'youtube', 'shopee']
      .map((k) => c[k])
      .filter(Boolean)
    const partes = [c.whatsapp && `WhatsApp: ${c.whatsapp}`, redes.length && `${redes.length} rede(s)`].filter(Boolean)
    return partes.join(' · ') || 'Sem dados'
  }
  const vals = Object.values(c).flat().filter(Boolean)
  return vals.length > 0 ? String(vals[0]) : ''
}

export function PaginaCms() {
  const [aba, setAba] = useState<Aba>('secoes')
  const qc = useQueryClient()
  const [modalSecao, setModalSecao] = useState<{ aberto: boolean; secao: SecaoLanding | null }>({
    aberto: false,
    secao: null,
  })
  const [modalPortfolio, setModalPortfolio] = useState<{
    aberto: boolean
    item: PortfolioItem | null
    grupoIds: string[]
  }>({
    aberto: false,
    item: null,
    grupoIds: [],
  })
  const [modalGrupo, setModalGrupo] = useState<{ aberto: boolean; grupo: PortfolioGrupo | null }>({
    aberto: false,
    grupo: null,
  })

  const secoes = useQuery({
    queryKey: ['cms-secoes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('SecaoLanding').select('*').order('ordem')
      if (error) throw error
      return (data ?? []) as SecaoLanding[]
    },
  })

  const grupos = useQuery({
    queryKey: ['cms-portfolio-grupos'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('PortfolioGrupo').select('*').order('ordem')
      if (error) throw error
      return (data ?? []) as PortfolioGrupo[]
    },
  })

  const portfolio = useQuery({
    queryKey: ['cms-portfolio'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('PortfolioItem').select('*').order('ordem')
      if (error) throw error
      return (data ?? []) as PortfolioItem[]
    },
  })

  const itemGrupos = useQuery({
    queryKey: ['cms-portfolio-item-grupos'],
    queryFn: async () => {
      if (!supabase) return new Map<string, string[]>()
      const { data, error } = await supabase.from('PortfolioItemGrupo').select('itemId, grupoId')
      if (error) throw error
      const map = new Map<string, string[]>()
      for (const row of data ?? []) {
        const lista = map.get(row.itemId) ?? []
        lista.push(row.grupoId)
        map.set(row.itemId, lista)
      }
      return map
    },
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['cms-secoes'] })
    qc.invalidateQueries({ queryKey: ['cms-portfolio'] })
    qc.invalidateQueries({ queryKey: ['cms-portfolio-grupos'] })
    qc.invalidateQueries({ queryKey: ['cms-portfolio-item-grupos'] })
    qc.invalidateQueries({ queryKey: ['landing'] })
  }

  const abrirSecao = useCallback((secao: SecaoLanding) => {
    setModalSecao({ aberto: true, secao })
  }, [])

  const nomesGrupoMap = new Map((grupos.data ?? []).map((g) => [g.id, g.nome]))
  const itens = portfolio.data ?? []
  const gruposPorItem = itemGrupos.data ?? new Map<string, string[]>()

  const itensComGrupos: PortfolioItemComGrupos[] = itens.map((item) => ({
    ...item,
    grupoIds: gruposPorItem.get(item.id) ?? [],
  }))

  const abrirItem = (item: PortfolioItem | null) => {
    setModalPortfolio({
      aberto: true,
      item,
      grupoIds: item ? (gruposPorItem.get(item.id) ?? []) : [],
    })
  }

  const linhasSecoes = (secoes.data ?? []).map((secao) => ({
    id: secao.id,
    slug: secao.slug,
    nome: NOMES_SECAO[secao.slug] ?? NOMES_SECAO[normalizarSlug(secao.slug)] ?? secao.titulo,
    publicado: secao.publicado,
    preview: previewSecao(secao),
    secao,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--texto)]">Conteúdo do site</h2>
      <div className="flex flex-wrap gap-2">
        <Botao variante={aba === 'secoes' ? 'primario' : 'fantasma'} onClick={() => setAba('secoes')}>
          Seções
        </Botao>
        <Botao variante={aba === 'grupos' ? 'primario' : 'fantasma'} onClick={() => setAba('grupos')}>
          Grupos
        </Botao>
        <Botao variante={aba === 'portfolio' ? 'primario' : 'fantasma'} onClick={() => setAba('portfolio')}>
          Portfólio
        </Botao>
      </div>

      {aba === 'secoes' && (
        <>
          {secoes.isLoading && <p className="text-sm text-[var(--texto-muted)]">Carregando seções...</p>}
          {secoes.isError && (
            <p className="text-sm text-erro">
              Erro ao carregar seções: {secoes.error instanceof Error ? secoes.error.message : 'Erro desconhecido'}
            </p>
          )}
          <TabelaDados
            idTabela="cms-secoes"
            colunasPadraoMobile={['nome', 'publicado', 'acoes']}
            colunas={[
              { id: 'nome', rotulo: 'Seção', obrigatoria: true },
              { id: 'slug', rotulo: 'Slug', render: (s) => <span className="font-mono text-xs">{s.slug}</span> },
              {
                id: 'publicado',
                rotulo: 'Status',
                render: (s) => (
                  <span className={s.publicado ? 'text-sucesso' : 'text-[var(--texto-muted)]'}>
                    {s.publicado ? 'Publicado' : 'Rascunho'}
                  </span>
                ),
              },
              {
                id: 'preview',
                rotulo: 'Conteúdo',
                render: (s) => (
                  <span className="line-clamp-1 text-[var(--texto-secundario)]">
                    {s.preview ? s.preview.slice(0, 60) + (s.preview.length > 60 ? '…' : '') : '—'}
                  </span>
                ),
              },
              {
                id: 'acoes',
                rotulo: '',
                render: (s) => (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); abrirSecao(s.secao) }}
                    className="text-sm text-secondary-600 hover:underline"
                  >
                    Editar
                  </button>
                ),
              },
            ]}
            dados={linhasSecoes}
            chave={(s) => s.id}
            onLinhaClick={(s) => abrirSecao(s.secao)}
            vazio="Nenhuma seção cadastrada. Execute as migrations do Supabase (006_seed.sql)."
          />
        </>
      )}

      {aba === 'grupos' && (
        <>
          <div className="flex justify-end">
            <Botao onClick={() => setModalGrupo({ aberto: true, grupo: null })}>Novo grupo</Botao>
          </div>
          {grupos.isError && (
            <p className="text-sm text-erro">
              Erro ao carregar grupos: {grupos.error instanceof Error ? grupos.error.message : 'Erro desconhecido'}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.data?.map((grupo) => {
              const imagens = urlsImagemGrupo(grupo, itensComGrupos)
              const imagem = imagens[0]
              return (
                <button
                  key={grupo.id}
                  type="button"
                  onClick={() => setModalGrupo({ aberto: true, grupo })}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--superficie)] text-left transition hover:border-secondary-500/50"
                >
                  {imagem ? (
                    <img
                      src={imagem}
                      alt={grupo.nome}
                      className="aspect-video w-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-[var(--superficie-elevada)] text-sm text-[var(--texto-muted)]">
                      Sem imagem
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 min-h-11 flex-1 font-semibold leading-snug text-[var(--texto)]">
                        {grupo.nome}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          grupo.publicado
                            ? 'bg-sucesso/15 text-sucesso'
                            : 'bg-[var(--superficie-elevada)] text-[var(--texto-muted)]'
                        }`}
                      >
                        {grupo.publicado ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                    {grupo.descricao && (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--texto-muted)]">{grupo.descricao}</p>
                    )}
                    <p className="mt-auto pt-2 text-xs text-[var(--texto-muted)]">Ordem: {grupo.ordem}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {aba === 'portfolio' && (
        <>
          <div className="flex justify-end">
            <Botao onClick={() => abrirItem(null)}>Novo item</Botao>
          </div>
          {portfolio.isError && (
            <p className="text-sm text-erro">
              Erro ao carregar portfólio: {portfolio.error instanceof Error ? portfolio.error.message : 'Erro desconhecido'}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.data?.map((item) => {
              const ids = gruposPorItem.get(item.id) ?? []
              const nomes = ids.map((id) => nomesGrupoMap.get(id)).filter(Boolean).join(', ')
              const preview = item.urlsImagem[0]
              return (
              <button
                key={item.id}
                type="button"
                onClick={() => abrirItem(item)}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--superficie)] text-left transition hover:border-secondary-500/50"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={item.titulo}
                    className="aspect-video w-full shrink-0 object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full shrink-0 items-center justify-center bg-[var(--superficie-elevada)] text-sm text-[var(--texto-muted)]">
                    Sem imagem
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 min-h-11 flex-1 font-semibold leading-snug text-[var(--texto)]">
                      {item.titulo}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        item.publicado
                          ? 'bg-sucesso/15 text-sucesso'
                          : 'bg-[var(--superficie-elevada)] text-[var(--texto-muted)]'
                      }`}
                    >
                      {item.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  {nomes && (
                    <p className="mt-1 text-xs text-[var(--texto-muted)]">
                      Grupos: {nomes}
                    </p>
                  )}
                  {item.urlsImagem.length > 1 && (
                    <p className="mt-0.5 text-xs text-[var(--texto-muted)]">
                      {item.urlsImagem.length} fotos
                    </p>
                  )}
                  <p className="mt-auto pt-2 text-xs text-[var(--texto-muted)]">Ordem: {item.ordem}</p>
                </div>
              </button>
            )})}
          </div>
        </>
      )}

      <ModalSecao
        aberto={modalSecao.aberto}
        secao={modalSecao.secao}
        onFechar={() => setModalSecao({ aberto: false, secao: null })}
        onSalvo={invalidar}
      />

      <ModalPortfolioGrupo
        aberto={modalGrupo.aberto}
        grupo={modalGrupo.grupo}
        onFechar={() => setModalGrupo({ aberto: false, grupo: null })}
        onSalvo={invalidar}
      />

      <ModalPortfolio
        aberto={modalPortfolio.aberto}
        item={modalPortfolio.item}
        grupoIdsIniciais={modalPortfolio.grupoIds}
        onFechar={() => setModalPortfolio({ aberto: false, item: null, grupoIds: [] })}
        onSalvo={invalidar}
      />
    </div>
  )
}
