import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { ModalPortfolio } from '@/funcionalidades/cms/modais/ModalPortfolio'
import { ModalSecao, NOMES_SECAO, normalizarSlug, parseConteudo } from '@/funcionalidades/cms/modais/ModalSecao'
import type { PortfolioItem, SecaoLanding } from '@/tipos/database'

type Aba = 'secoes' | 'portfolio'

function previewSecao(secao: SecaoLanding): string {
  const c = parseConteudo(secao.conteudo)
  const slug = normalizarSlug(secao.slug)
  if (slug === 'servicos' && Array.isArray(c.itens)) {
    return (c.itens as string[]).join(', ')
  }
  if (slug === 'sobre' && typeof c.texto === 'string') return c.texto
  if (slug === 'hero') {
    return [c.titulo, c.subtitulo].filter(Boolean).join(' — ')
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
  const [modalPortfolio, setModalPortfolio] = useState<{ aberto: boolean; item: PortfolioItem | null }>({
    aberto: false,
    item: null,
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

  const portfolio = useQuery({
    queryKey: ['cms-portfolio'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('PortfolioItem').select('*').order('ordem')
      if (error) throw error
      return (data ?? []) as PortfolioItem[]
    },
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['cms-secoes'] })
    qc.invalidateQueries({ queryKey: ['cms-portfolio'] })
    qc.invalidateQueries({ queryKey: ['landing'] })
  }

  const abrirSecao = useCallback((secao: SecaoLanding) => {
    setModalSecao({ aberto: true, secao })
  }, [])

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
      <div className="flex gap-2">
        <Botao variante={aba === 'secoes' ? 'primario' : 'fantasma'} onClick={() => setAba('secoes')}>
          Seções
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
            colunas={[
              { id: 'nome', rotulo: 'Seção' },
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

      {aba === 'portfolio' && (
        <>
          <div className="flex justify-end">
            <Botao onClick={() => setModalPortfolio({ aberto: true, item: null })}>Novo item</Botao>
          </div>
          {portfolio.isError && (
            <p className="text-sm text-erro">
              Erro ao carregar portfólio: {portfolio.error instanceof Error ? portfolio.error.message : 'Erro desconhecido'}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.data?.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setModalPortfolio({ aberto: true, item })}
                className="overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--superficie)] text-left transition hover:border-secondary-500/50"
              >
                <img
                  src={item.urlImagem}
                  alt={item.titulo}
                  className="aspect-video w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[var(--texto)]">{item.titulo}</h3>
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
                  <p className="mt-1 text-xs text-[var(--texto-muted)]">Ordem: {item.ordem}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <ModalSecao
        aberto={modalSecao.aberto}
        secao={modalSecao.secao}
        onFechar={() => setModalSecao({ aberto: false, secao: null })}
        onSalvo={invalidar}
      />

      <ModalPortfolio
        aberto={modalPortfolio.aberto}
        item={modalPortfolio.item}
        onFechar={() => setModalPortfolio({ aberto: false, item: null })}
        onSalvo={invalidar}
      />
    </div>
  )
}
