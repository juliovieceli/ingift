import { urlImagemGrupo } from '@/funcionalidades/landing/portfolioGrupo'
import type { PortfolioGrupo, PortfolioItem } from '@/tipos/database'
import { Link } from 'react-router-dom'

interface Props {
  grupo: PortfolioGrupo
  itens: PortfolioItem[]
  idx?: number
  hoverCapaz?: boolean
}

export function CardGrupoPortfolio({ grupo, itens, idx = 0, hoverCapaz = false }: Props) {
  const imagem = urlImagemGrupo(grupo, itens)

  return (
    <Link
      to={`/portfolio?grupo=${grupo.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-[var(--borda)] transition hover:border-secondary-500/50"
      style={{ transitionDelay: `${idx * 80}ms` }}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--superficie-elevada)]">
        {imagem ? (
          <img
            src={imagem}
            alt={grupo.nome}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition duration-500 ${hoverCapaz ? 'group-hover:scale-105' : ''}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--texto-muted)]">
            Sem imagem
          </div>
        )}
        {hoverCapaz && imagem && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="font-medium text-[var(--texto)]">{grupo.nome}</p>
        {grupo.descricao && (
          <p className="mt-1 line-clamp-3 text-sm text-[var(--texto-muted)]">{grupo.descricao}</p>
        )}
      </div>
    </Link>
  )
}
