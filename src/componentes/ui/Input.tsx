import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
}

export function Input({ rotulo, className = '', id, ...props }: Props) {
  const inputId = id ?? rotulo?.toLowerCase().replace(/\s/g, '-')
  return (
    <label className="flex flex-col gap-1 text-sm">
      {rotulo && <span className="text-[var(--texto-secundario)]">{rotulo}</span>}
      <input
        id={inputId}
        className={`rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)] outline-none focus:border-secondary-500 ${className}`}
        {...props}
      />
    </label>
  )
}
