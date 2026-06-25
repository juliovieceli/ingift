import { useScrollReveal } from '@/hooks/useScrollReveal'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import type { PortfolioItem } from '@/tipos/database'

interface Props {
  titulo: string
  subtitulo?: string
  itens: PortfolioItem[]
}

export function SecaoPortfolio({ titulo, subtitulo, itens }: Props) {
  const { ref, className } = useScrollReveal()
  const { hoverCapaz } = usePrefersMotion()

  return (
    <section id="portfolio" ref={ref} className={`secao-lazy bg-[var(--superficie)] px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--texto)]">{titulo}</h2>
        {subtitulo && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[var(--texto-secundario)]">{subtitulo}</p>
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((item, idx) => (
            <figure
              key={item.id}
              className="group overflow-hidden rounded-xl border border-[var(--borda)]"
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={item.urlImagem}
                  alt={item.titulo}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition duration-500 ${hoverCapaz ? 'group-hover:scale-105' : ''}`}
                />
                {hoverCapaz && (
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
              </div>
              <figcaption className="p-3">
                <p className="font-medium text-[var(--texto)]">{item.titulo}</p>
                {item.descricao && (
                  <p className="text-sm text-[var(--texto-muted)]">{item.descricao}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
