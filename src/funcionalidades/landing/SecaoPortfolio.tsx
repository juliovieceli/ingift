import { Botao } from '@/componentes/ui/Botao'
import { CardPortfolio } from '@/funcionalidades/landing/componentes/CardPortfolio'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { PortfolioItem } from '@/tipos/database'
import { Link } from 'react-router-dom'

const MAX_DESTAQUES = 4

interface Props {
  titulo: string
  subtitulo?: string
  itens: PortfolioItem[]
}

export function SecaoPortfolio({ titulo, subtitulo, itens }: Props) {
  const { ref, className } = useScrollReveal()
  const { hoverCapaz } = usePrefersMotion()
  const destaques = itens.slice(0, MAX_DESTAQUES)
  const temMais = itens.length > MAX_DESTAQUES

  return (
    <section id="portfolio" ref={ref} className={`secao-lazy bg-[var(--superficie)] px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--texto)]">{titulo}</h2>
        {subtitulo && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--texto-secundario)]">{subtitulo}</p>
        )}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((item, idx) => (
            <CardPortfolio key={item.id} item={item} idx={idx} hoverCapaz={hoverCapaz} />
          ))}
        </div>
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
