import { Search } from 'lucide-react'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'

interface Props {
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
  className?: string
}

export function CampoPesquisa({ valor, onChange, placeholder = 'Pesquisar...', className = '' }: Props) {
  return (
    <div className={`relative ${className || 'max-w-sm'}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-muted)]" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onFocus={selecionarTextoAoFocar}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie)] py-2 pl-9 pr-3 text-sm text-[var(--texto)] outline-none focus:border-secondary-500"
      />
    </div>
  )
}
