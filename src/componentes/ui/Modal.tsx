import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
  largura?: 'md' | 'lg' | 'xl'
}

const larguras = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ aberto, onFechar, titulo, children, largura = 'lg' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!aberto) return
    const el = ref.current
    if (!el) return
    el.showModal()
    return () => {
      if (el.open) el.close()
    }
  }, [aberto])

  if (!aberto) return null

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFechar()
      }}
      className={`fixed top-1/2 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ${larguras[largura]} rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-0 text-[var(--texto)] shadow-xl backdrop:bg-black/50`}
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--borda)] px-5 py-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-[var(--texto-muted)] hover:bg-[var(--superficie-elevada)]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  )
}
