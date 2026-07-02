import { Botao } from '@/componentes/ui/Botao'
import { CarrosselImagens, cliqueVeioDoCarrossel } from '@/componentes/ui/CarrosselImagens'
import { ModalDetalhePortfolio } from '@/funcionalidades/landing/componentes/ModalDetalhePortfolio'
import type { PortfolioItemComGrupos } from '@/tipos/database'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

interface Props {
  item: PortfolioItemComGrupos
  nomesGrupo?: string[]
  idx?: number
  hoverCapaz?: boolean
  className?: string
}

export function CardPortfolio({ item, nomesGrupo = [], idx = 0, hoverCapaz = false, className = '' }: Props) {
  const descRef = useRef<HTMLParagraphElement>(null)
  const [truncado, setTruncado] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    const el = descRef.current
    if (!el || !item.descricao) {
      setTruncado(false)
      return
    }
    setTruncado(el.scrollHeight > el.clientHeight + 1)
  }, [item.descricao])

  const abrirDetalhe = () => setModalAberto(true)

  const aoClicar = (e: MouseEvent<HTMLElement>) => {
    if (cliqueVeioDoCarrossel(e.target)) return
    abrirDetalhe()
  }

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      abrirDetalhe()
    }
  }

  return (
    <>
      <figure
        role="button"
        tabIndex={0}
        onClick={aoClicar}
        onKeyDown={aoTeclar}
        className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--borda)] transition hover:border-secondary-500/50 ${className}`}
        style={{ transitionDelay: `${idx * 80}ms` }}
      >
        <div className="relative aspect-square overflow-hidden">
          <CarrosselImagens
            imagens={item.urlsImagem}
            alt={item.titulo}
            hoverCapaz={hoverCapaz}
            autoPlay={item.urlsImagem.length > 1}
          />
          {hoverCapaz && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}
        </div>
        <figcaption className="flex flex-1 flex-col p-3">
          <p className="font-medium text-[var(--texto)]">{item.titulo}</p>
          {item.descricao && (
            <div className={`mt-1 w-full text-left ${truncado ? 'opacity-90' : ''}`}>
              <p ref={descRef} className="line-clamp-3 text-sm text-[var(--texto-muted)]">
                {item.descricao}
              </p>
            </div>
          )}
          {item.urlLoja && (
            <a
              href={item.urlLoja}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block self-start"
              onClick={(e) => e.stopPropagation()}
            >
              <Botao type="button" variante="secundario" className="px-3 py-1.5 text-xs">
                Quero esse
              </Botao>
            </a>
          )}
        </figcaption>
      </figure>

      <ModalDetalhePortfolio
        aberto={modalAberto}
        titulo={item.titulo}
        descricao={item.descricao}
        urlsImagem={item.urlsImagem}
        grupos={nomesGrupo}
        urlLoja={item.urlLoja}
        onFechar={() => setModalAberto(false)}
      />
    </>
  )
}
