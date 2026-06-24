import type { ReactNode, SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string
  erro?: string
  children: ReactNode
}

export function CampoSelect({ rotulo, erro, className = '', children, ...props }: Props) {
  const borda = erro
    ? 'border-erro focus:border-erro'
    : 'border-[var(--borda)] focus:border-secondary-500'

  return (
    <label className="flex flex-col gap-1 text-sm">
      {rotulo && <span className="text-[var(--texto-secundario)]">{rotulo}</span>}
      <select
        className={`rounded-lg border bg-[var(--superficie)] px-2 py-2 text-[var(--texto)] outline-none ${borda} ${className}`}
        {...props}
      >
        {children}
      </select>
      {erro && <span className="text-xs text-erro">{erro}</span>}
    </label>
  )
}
