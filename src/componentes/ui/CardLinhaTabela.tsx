import type { ColunaTabela } from '@/componentes/ui/TabelaDados'

interface Props<T> {
  item: T
  colunas: ColunaTabela<T>[]
  onClick?: () => void
}

export function CardLinhaTabela<T extends Record<string, unknown>>({
  item,
  colunas,
  onClick,
}: Props<T>) {
  const colunasCard = colunas.filter((c) => c.exibirNoCard !== false && c.id !== 'acoes')
  const colAcoes = colunas.find((c) => c.id === 'acoes')

  const conteudo = (
    <div className="space-y-2">
      {colunasCard.map((col) => (
        <div key={col.id} className="flex items-start justify-between gap-3 text-sm">
          {col.rotulo && (
            <span className="shrink-0 text-[var(--texto-muted)]">{col.rotulo}</span>
          )}
          <div className={`min-w-0 text-right ${col.rotulo ? '' : 'w-full text-left'}`}>
            {col.render ? col.render(item) : String(item[col.id] ?? '—')}
          </div>
        </div>
      ))}
      {colAcoes?.render && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--borda)] pt-2">
          {colAcoes.render(item)}
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 text-left transition hover:bg-[var(--superficie-elevada)]/50"
      >
        {conteudo}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4">
      {conteudo}
    </div>
  )
}
