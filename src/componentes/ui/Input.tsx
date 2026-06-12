import { useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from 'react'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
}

function criarEventoChange(input: HTMLInputElement, valor: string): ChangeEvent<HTMLInputElement> {
  return {
    target: { ...input, value: valor },
    currentTarget: input,
  } as ChangeEvent<HTMLInputElement>
}

function valorNumericoFinal(texto: string): string {
  const bruto = texto.trim()
  if (bruto === '' || bruto === '-') return '0'
  const n = Number(bruto)
  return Number.isFinite(n) ? bruto : '0'
}

export function Input({ rotulo, className = '', id, type, value, onChange, onFocus, onBlur, ...props }: Props) {
  const inputId = id ?? rotulo?.toLowerCase().replace(/\s/g, '-')
  const [textoEditando, setTextoEditando] = useState<string | null>(null)
  const isNumber = type === 'number'
  const valorExibido = isNumber && textoEditando !== null ? textoEditando : value

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    selecionarTextoAoFocar(e)
    if (isNumber) setTextoEditando(String(value ?? ''))
    onFocus?.(e)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isNumber) {
      setTextoEditando(e.target.value)
      return
    }
    onChange?.(e)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (isNumber) {
      const final = valorNumericoFinal(textoEditando ?? String(value ?? ''))
      onChange?.(criarEventoChange(e.currentTarget, final))
      setTextoEditando(null)
    }
    onBlur?.(e)
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      {rotulo && <span className="text-[var(--texto-secundario)]">{rotulo}</span>}
      <input
        id={inputId}
        type={type}
        value={valorExibido}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)] outline-none focus:border-secondary-500 ${className}`}
        {...props}
      />
    </label>
  )
}
