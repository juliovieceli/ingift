import { Botao } from '@/componentes/ui/Botao'
import { CardGrupoPortfolio } from '@/funcionalidades/landing/componentes/CardGrupoPortfolio'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { PortfolioGrupo, PortfolioItem } from '@/tipos/database'
import { Link } from 'react-router-dom'

const MAX_DESTAQUES = 4

interface Props {
  titulo: string
  subtitulo?: string
  grupos: PortfolioGrupo[]
  itens: PortfolioItem[]
}

export function SecaoPortfolio({ titulo, subtitulo, grupos, itens }: Props) {
  const { ref, className } = useScrollReveal()
  const { hoverCapaz } = usePrefersMotion()
  const ordenados = [...grupos].sort((a, b) => a.ordem - b.ordem)
  const destaques = ordenados.slice(0, MAX_DESTAQUES)
  const temMais = ordenados.length > MAX_DESTAQUES

  return (
    <section id="portfolio" ref={ref} className={`secao-lazy bg-[var(--superficie)] px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--texto)]">{titulo}</h2>
        {subtitulo && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--texto-secundario)]">{subtitulo}</p>
        )}
        {destaques.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((grupo, idx) => (
              <CardGrupoPortfolio
                key={grupo.id}
                grupo={grupo}
                itens={itens}
                idx={idx}
                hoverCapaz={hoverCapaz}
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-[var(--texto-muted)]">Nenhum grupo publicado ainda.</p>
        )}
        {temMais && (
          <div className="mt-8 flex justify-center">
            <Link to="/portfolio">
              <Botao variante="fantasma">
                Ver catálogo completo
              </Botao>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
