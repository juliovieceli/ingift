import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma'
  children: ReactNode
}

const classes = {
  primario: 'bg-[var(--primaria)] text-[var(--primaria-fg)] hover:opacity-90',
  secundario: 'bg-secondary-500 text-[var(--secundaria-fg)] hover:bg-secondary-400',
  fantasma: 'bg-transparent border border-[var(--borda)] text-[var(--texto)] hover:bg-[var(--superficie-elevada)]',
}

export function Botao({ variante = 'primario', className = '', children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${classes[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
