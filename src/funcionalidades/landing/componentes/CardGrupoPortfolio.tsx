import { CarrosselImagens, cliqueVeioDoCarrossel } from '@/componentes/ui/CarrosselImagens'
import { urlsImagemGrupo } from '@/funcionalidades/landing/portfolioGrupo'
import type { PortfolioGrupo, PortfolioItemComGrupos } from '@/tipos/database'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  grupo: PortfolioGrupo
  itens: PortfolioItemComGrupos[]
  idx?: number
  hoverCapaz?: boolean
}

export function CardGrupoPortfolio({ grupo, itens, idx = 0, hoverCapaz = false }: Props) {
  const navigate = useNavigate()
  const imagens = urlsImagemGrupo(grupo, itens)
  const destino = `/portfolio?grupo=${grupo.id}`

  const irParaPortfolio = (e: MouseEvent<HTMLElement>) => {
    if (cliqueVeioDoCarrossel(e.target)) return
    navigate(destino)
  }

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(destino)
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={irParaPortfolio}
      onKeyDown={aoTeclar}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--borda)] transition hover:border-secondary-500/50"
      style={{ transitionDelay: `${idx * 80}ms` }}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--superficie-elevada)]">
        {imagens.length > 0 ? (
          <>
            <CarrosselImagens
              imagens={imagens}
              alt={grupo.nome}
              hoverCapaz={hoverCapaz}
              autoPlay={imagens.length > 1}
            />
            {hoverCapaz && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--texto-muted)]">
            Sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="font-medium text-[var(--texto)]">{grupo.nome}</p>
        {grupo.descricao && (
          <p className="mt-1 line-clamp-3 text-sm text-[var(--texto-muted)]">{grupo.descricao}</p>
        )}
      </div>
    </article>
  )
}
