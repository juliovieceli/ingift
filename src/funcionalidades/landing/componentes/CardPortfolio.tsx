import { useEffect, useRef, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { ModalDetalhePortfolio } from '@/funcionalidades/landing/componentes/ModalDetalhePortfolio'
import type { PortfolioItem } from '@/tipos/database'

interface Props {
  item: PortfolioItem
  idx?: number
  hoverCapaz?: boolean
  className?: string
}

export function CardPortfolio({ item, idx = 0, hoverCapaz = false, className = '' }: Props) {
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

  return (
    <>
      <figure
        className={`group flex w-full flex-col overflow-hidden rounded-xl border border-[var(--borda)] ${className}`}
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
        <figcaption className="flex flex-1 flex-col p-3">
          {item.grupo && (
            <span className="mb-1 w-fit rounded-full bg-[var(--superficie-elevada)] px-2 py-0.5 text-xs text-[var(--texto-muted)]">
              {item.grupo}
            </span>
          )}
          <p className="font-medium text-[var(--texto)]">{item.titulo}</p>
          {item.descricao && (
            <button
              type="button"
              onClick={abrirDetalhe}
              className={`mt-1 w-full text-left transition ${truncado ? 'hover:opacity-80' : 'hover:text-[var(--texto-secundario)]'}`}
            >
              <p ref={descRef} className="line-clamp-3 text-sm text-[var(--texto-muted)]">
                {item.descricao}
              </p>
            </button>
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

      {item.descricao && (
        <ModalDetalhePortfolio
          aberto={modalAberto}
          titulo={item.titulo}
          descricao={item.descricao}
          urlImagem={item.urlImagem}
          grupo={item.grupo}
          urlLoja={item.urlLoja}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </>
  )
}
