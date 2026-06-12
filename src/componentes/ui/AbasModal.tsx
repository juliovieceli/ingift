import type { ReactNode } from 'react'

interface Aba {
  id: string
  rotulo: string
}

interface Props {
  abas: Aba[]
  abaAtiva: string
  onMudarAba: (id: string) => void
  children: ReactNode
}

export function AbasModal({ abas, abaAtiva, onMudarAba, children }: Props) {
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[var(--borda)]">
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => onMudarAba(aba.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              abaAtiva === aba.id
                ? 'border-b-2 border-secondary-500 text-secondary-600 dark:text-secondary-400'
                : 'text-[var(--texto-muted)] hover:text-[var(--texto)]'
            }`}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
