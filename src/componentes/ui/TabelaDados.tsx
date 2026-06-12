import type { ReactNode } from 'react'
import type { Direcao } from '@/hooks/useOrdenacaoPaginacao'

export interface ColunaTabela<T> {
  id: string
  rotulo: string
  ordenavel?: boolean
  render?: (item: T) => ReactNode
  className?: string
}

interface Props<T> {
  colunas: ColunaTabela<T>[]
  dados: T[]
  chave: (item: T) => string
  ordenacao?: { coluna: string; direcao: Direcao }
  onOrdenar?: (coluna: string) => void
  onLinhaClick?: (item: T) => void
  vazio?: ReactNode
  pagina?: number
  totalPaginas?: number
  totalItens?: number
  itensPorPagina?: number
  onPagina?: (p: number) => void
  onItensPorPagina?: (n: number) => void
}

export function TabelaDados<T extends Record<string, unknown>>({
  colunas,
  dados,
  chave,
  ordenacao,
  onOrdenar,
  onLinhaClick,
  vazio,
  pagina,
  totalPaginas,
  totalItens,
  itensPorPagina,
  onPagina,
  onItensPorPagina,
}: Props<T>) {
  const comPaginacao = pagina != null && totalPaginas != null && onPagina != null

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--borda)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--superficie-elevada)] text-[var(--texto-secundario)]">
            <tr>
              {colunas.map((col) => (
                <th key={col.id} className={`p-3 ${col.className ?? ''}`}>
                  {col.ordenavel && onOrdenar ? (
                    <button
                      type="button"
                      onClick={() => onOrdenar(col.id)}
                      className="inline-flex items-center gap-1 hover:text-[var(--texto)]"
                      aria-label={`Ordenar por ${col.rotulo}`}
                    >
                      {col.rotulo}
                      {ordenacao?.coluna === col.id && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                  ) : (
                    col.rotulo
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 && (
              <tr>
                <td colSpan={colunas.length} className="p-6 text-center text-[var(--texto-muted)]">
                  {vazio ?? 'Nenhum registro encontrado.'}
                </td>
              </tr>
            )}
            {dados.map((item) => (
              <tr
                key={chave(item)}
                onClick={onLinhaClick ? () => onLinhaClick(item) : undefined}
                className={`border-t border-[var(--borda)] ${
                  onLinhaClick ? 'cursor-pointer hover:bg-[var(--superficie-elevada)]/50' : ''
                }`}
              >
                {colunas.map((col) => (
                  <td key={col.id} className={`p-3 ${col.className ?? ''}`}>
                    {col.render ? col.render(item) : String(item[col.id] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comPaginacao && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--texto-muted)]">
          <span>
            {totalItens ?? dados.length} registro{(totalItens ?? dados.length) !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            {onItensPorPagina && itensPorPagina != null && (
              <select
                value={itensPorPagina}
                onChange={(e) => onItensPorPagina(+e.target.value)}
                className="rounded border border-[var(--borda)] bg-[var(--superficie)] px-2 py-1 text-sm"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n} por página</option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={pagina! <= 1}
              onClick={() => onPagina!(pagina! - 1)}
              className="rounded border border-[var(--borda)] px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina! >= totalPaginas!}
              onClick={() => onPagina!(pagina! + 1)}
              className="rounded border border-[var(--borda)] px-2 py-1 disabled:opacity-40"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
