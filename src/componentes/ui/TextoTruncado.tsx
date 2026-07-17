import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  texto: string
  children?: ReactNode
  className?: string
}

/**
 * Trunca o texto em uma linha e, apenas quando ele estoura a largura
 * disponível, exibe um tooltip estilizado ao passar o mouse.
 */
export function TextoTruncado({ texto, children, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)

  const aoEntrar = () => {
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth + 1) return
    const r = el.getBoundingClientRect()
    setCoords({ x: r.left + r.width / 2, y: r.top })
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={aoEntrar}
        onMouseLeave={() => setCoords(null)}
        className={`block truncate ${className ?? ''}`}
      >
        {children ?? texto}
      </span>
      {coords &&
        texto &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: coords.x, top: coords.y - 10 }}
            className="pointer-events-none fixed z-[999] max-w-xs -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-elevada)] px-3 py-2 text-xs leading-snug text-[var(--texto)] shadow-lg"
          >
            {texto}
            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-[var(--borda)]" />
            <span className="absolute left-1/2 top-full mt-[-1px] h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-[var(--superficie-elevada)]" />
          </div>,
          document.body,
        )}
    </>
  )
}
