import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  imagens: string[]
  alt: string
  hoverCapaz?: boolean
  className?: string
  autoPlay?: boolean
  intervaloMs?: number
}

function pararInteracaoCard(e: SyntheticEvent) {
  e.stopPropagation()
  e.preventDefault()
}

export function CarrosselImagens({
  imagens,
  alt,
  hoverCapaz = false,
  className = '',
  autoPlay = false,
  intervaloMs = 4000,
}: Props) {
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const total = imagens.length
  const atual = imagens[indice] ?? imagens[0]

  const ir = useCallback(
    (novo: number, e?: MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      setIndice((novo + total) % total)
    },
    [total],
  )

  useEffect(() => {
    if (!autoPlay || total <= 1 || pausado) return
    const id = window.setInterval(() => {
      setIndice((atualIndice) => (atualIndice + 1) % total)
    }, intervaloMs)
    return () => window.clearInterval(id)
  }, [autoPlay, intervaloMs, total, pausado])

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (total <= 1) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      ir(indice - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      ir(indice + 1)
    }
  }

  if (!atual) {
    return (
      <div className={`flex h-full items-center justify-center bg-[var(--superficie-elevada)] text-sm text-[var(--texto-muted)] ${className}`}>
        Sem imagem
      </div>
    )
  }

  if (total <= 1) {
    return (
      <img
        src={atual}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition duration-500 ${hoverCapaz ? 'group-hover:scale-105' : ''} ${className}`}
      />
    )
  }

  return (
    <div
      className={`relative h-full w-full ${className}`}
      onKeyDown={aoTeclar}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <img
        src={atual}
        alt={`${alt} — ${indice + 1} de ${total}`}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition duration-500 ${hoverCapaz ? 'group-hover:scale-105' : ''}`}
      />

      <button
        type="button"
        aria-label="Imagem anterior"
        data-carrossel-controle
        onClick={(e) => ir(indice - 1, e)}
        onMouseDown={pararInteracaoCard}
        onPointerDown={pararInteracaoCard}
        className="absolute left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary-950/60 text-white transition hover:bg-primary-950/80"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Próxima imagem"
        data-carrossel-controle
        onClick={(e) => ir(indice + 1, e)}
        onMouseDown={pararInteracaoCard}
        onPointerDown={pararInteracaoCard}
        className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary-950/60 text-white transition hover:bg-primary-950/80"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5">
        {imagens.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para imagem ${i + 1}`}
            data-carrossel-controle
            onClick={(e) => ir(i, e)}
            onMouseDown={pararInteracaoCard}
            onPointerDown={pararInteracaoCard}
            className={`h-1.5 rounded-full transition ${
              i === indice ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/** Verifica se o clique veio de um controle do carrossel. */
export function cliqueVeioDoCarrossel(alvo: EventTarget | null): boolean {
  return Boolean((alvo as HTMLElement | null)?.closest('[data-carrossel-controle]'))
}
