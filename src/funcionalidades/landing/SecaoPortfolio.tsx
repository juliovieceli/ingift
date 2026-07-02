import { Botao } from '@/componentes/ui/Botao'
import { CardGrupoPortfolio } from '@/funcionalidades/landing/componentes/CardGrupoPortfolio'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { PortfolioGrupo, PortfolioItemComGrupos } from '@/tipos/database'
import { Link } from 'react-router-dom'

const MAX_DESTAQUES = 4

interface Props {
  titulo: string
  subtitulo?: string
  grupos: PortfolioGrupo[]
  itens: PortfolioItemComGrupos[]
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
          <div className="mt-10 flex flex-wrap justify-center gap-6">
            {destaques.map((grupo, idx) => (
              <div key={grupo.id} className="w-full max-w-xs sm:max-w-[calc(50%-0.75rem)] lg:w-64">
                <CardGrupoPortfolio
                  grupo={grupo}
                  itens={itens}
                  idx={idx}
                  hoverCapaz={hoverCapaz}
                />
              </div>
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
