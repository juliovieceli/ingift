import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import { CardPortfolio } from '@/funcionalidades/landing/componentes/CardPortfolio'
import { nomeGrupo } from '@/funcionalidades/landing/portfolioGrupo'
import { useLandingDados } from './useLandingDados'

function normalizarBusca(texto: string): string {
  return texto.trim().toLowerCase()
}

export function PaginaPortfolio() {
  const { secao, portfolioGrupos, portfolio } = useLandingDados()
  const { hoverCapaz } = usePrefersMotion()
  const portfolioSecao = secao('portfolio')?.conteudo as { subtitulo?: string } | undefined
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(params.get('grupo'))

  const grupos = useMemo(
    () => [...(portfolioGrupos.data ?? [])].sort((a, b) => a.ordem - b.ordem),
    [portfolioGrupos.data],
  )

  const itens = useMemo(
    () => [...(portfolio.data ?? [])].sort((a, b) => a.ordem - b.ordem),
    [portfolio.data],
  )

  useEffect(() => {
    const id = params.get('grupo')
    setGrupoAtivo(id)
  }, [params])

  const selecionarGrupo = (id: string | null) => {
    setGrupoAtivo(id)
    if (id) {
      setParams({ grupo: id })
    } else {
      setParams({})
    }
  }

  const itensFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca)
    return itens.filter((item) => {
      if (grupoAtivo && item.grupoId !== grupoAtivo) return false
      if (!termo) return true
      const titulo = item.titulo.toLowerCase()
      const descricao = (item.descricao ?? '').toLowerCase()
      const grupo = (nomeGrupo(item.grupoId, grupos) ?? '').toLowerCase()
      return titulo.includes(termo) || descricao.includes(termo) || grupo.includes(termo)
    })
  }, [itens, busca, grupoAtivo, grupos])

  return (
    <div className="bg-[var(--superficie)] px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--texto-muted)] transition hover:text-secondary-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <h1 className="text-center text-3xl font-bold text-[var(--texto)]">
          {secao('portfolio')?.titulo ?? 'Portfólio'}
        </h1>
        {portfolioSecao?.subtitulo && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--texto-secundario)]">
            {portfolioSecao.subtitulo}
          </p>
        )}

        {itens.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="max-w-lg">
              <CampoPesquisa
                valor={busca}
                onChange={setBusca}
                placeholder="Pesquisar por título, descrição ou grupo..."
              />
            </div>
            {grupos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selecionarGrupo(null)}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    grupoAtivo === null
                      ? 'bg-secondary-500 text-[var(--secundaria-fg)]'
                      : 'border border-[var(--borda)] text-[var(--texto-secundario)] hover:border-secondary-500'
                  }`}
                >
                  Todos
                </button>
                {grupos.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selecionarGrupo(g.id)}
                    className={`rounded-full px-3 py-1 text-sm transition ${
                      grupoAtivo === g.id
                        ? 'bg-secondary-500 text-[var(--secundaria-fg)]'
                        : 'border border-[var(--borda)] text-[var(--texto-secundario)] hover:border-secondary-500'
                    }`}
                  >
                    {g.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {itens.length === 0 ? (
          <p className="mt-12 text-center text-[var(--texto-muted)]">Nenhum item publicado ainda.</p>
        ) : itensFiltrados.length === 0 ? (
          <p className="mt-12 text-center text-[var(--texto-muted)]">Nenhum item encontrado com esses filtros.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itensFiltrados.map((item, idx) => (
              <CardPortfolio
                key={item.id}
                item={item}
                idx={idx}
                hoverCapaz={hoverCapaz}
                nomeGrupo={nomeGrupo(item.grupoId, grupos)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
