import { useMemo, useState, type ReactNode } from 'react'
import { Columns3 } from 'lucide-react'
import type { Direcao } from '@/hooks/useOrdenacaoPaginacao'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useVisibilidadeColunas } from '@/hooks/useVisibilidadeColunas'
import { CardLinhaTabela } from '@/componentes/ui/CardLinhaTabela'
import { ModalColunasTabela } from '@/componentes/ui/ModalColunasTabela'

export interface ColunaTabela<T> {
  id: string
  rotulo: string
  ordenavel?: boolean
  render?: (item: T) => ReactNode
  className?: string
  ocultavel?: boolean
  obrigatoria?: boolean
  prioridade?: number
  exibirNoCard?: boolean
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
  idTabela?: string
  configColunas?: boolean
  colunasPadraoMobile?: string[]
  renderCard?: (item: T, colunasVisiveis: ColunaTabela<T>[]) => ReactNode
  barra?: ReactNode
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
  idTabela,
  configColunas,
  colunasPadraoMobile,
  renderCard,
  barra,
}: Props<T>) {
  const { ehMobile } = useBreakpoint()
  const [modalColunasAberto, setModalColunasAberto] = useState(false)
  const comPaginacao = pagina != null && totalPaginas != null && onPagina != null

  const permiteConfig = configColunas ?? Boolean(idTabela)

  const configsColunas = useMemo(
    () =>
      colunas.map((c) => ({
        id: c.id,
        obrigatoria: c.obrigatoria,
        ocultavel: c.ocultavel,
      })),
    [colunas],
  )

  const visibilidade = useVisibilidadeColunas(
    idTabela ?? 'default',
    configsColunas,
    colunasPadraoMobile,
  )

  const colunasFiltradas = useMemo(() => {
    if (!permiteConfig || !idTabela) return colunas
    const set = new Set(visibilidade.visiveis)
    return colunas.filter((c) => set.has(c.id))
  }, [colunas, permiteConfig, idTabela, visibilidade.visiveis])

  const paginacao = comPaginacao && (
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
  )

  const botaoColunas = permiteConfig && idTabela && (
    <button
      type="button"
      onClick={() => setModalColunasAberto(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--borda)] px-3 py-1.5 text-sm text-[var(--texto-secundario)] transition hover:bg-[var(--superficie-elevada)] hover:text-[var(--texto)]"
      aria-label="Configurar colunas"
    >
      <Columns3 className="h-4 w-4" />
      <span className="hidden sm:inline">Colunas</span>
    </button>
  )

  const barraSuperior = (barra || botaoColunas) && (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">{barra}</div>
      {botaoColunas}
    </div>
  )

  const modalColunas = permiteConfig && idTabela && (
    <ModalColunasTabela
      aberto={modalColunasAberto}
      onFechar={() => setModalColunasAberto(false)}
      colunas={colunas.map((c) => ({
        id: c.id,
        rotulo: c.rotulo || c.id,
        obrigatoria: c.obrigatoria,
        ocultavel: c.ocultavel,
      }))}
      visiveis={visibilidade.visiveis}
      onAplicar={visibilidade.aplicar}
      onResetar={visibilidade.resetar}
    />
  )

  if (ehMobile) {
    return (
      <div className="space-y-3">
        {barraSuperior}
        {dados.length === 0 ? (
          <div className="rounded-xl border border-[var(--borda)] p-6 text-center text-sm text-[var(--texto-muted)]">
            {vazio ?? 'Nenhum registro encontrado.'}
          </div>
        ) : (
          <div className="space-y-3">
            {dados.map((item) => (
              <div key={chave(item)}>
                {renderCard ? (
                  renderCard(item, colunasFiltradas)
                ) : (
                  <CardLinhaTabela
                    item={item}
                    colunas={colunasFiltradas}
                    onClick={onLinhaClick ? () => onLinhaClick(item) : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {paginacao}
        {modalColunas}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {barraSuperior}
      <div className="overflow-x-auto rounded-xl border border-[var(--borda)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--superficie-elevada)] text-[var(--texto-secundario)]">
            <tr>
              {colunasFiltradas.map((col) => (
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
                <td colSpan={colunasFiltradas.length} className="p-6 text-center text-[var(--texto-muted)]">
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
                {colunasFiltradas.map((col) => (
                  <td key={col.id} className={`p-3 ${col.className ?? ''}`}>
                    {col.render ? col.render(item) : String(item[col.id] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginacao}
      {modalColunas}
    </div>
  )
}
