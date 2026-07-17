import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import {
  buscarConsignacoes,
  saldoAReceber,
  valorConsignado,
  type ConsignacaoComResumo,
} from '@/lib/consignacao'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { usePesquisa } from '@/hooks/usePesquisa'

const FILTROS = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'aberta', rotulo: 'Abertas' },
  { valor: 'encerrada', rotulo: 'Encerradas' },
] as const

type FiltroStatus = (typeof FILTROS)[number]['valor']

export function PaginaConsignacoes() {
  const navigate = useNavigate()
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('aberta')

  const consignacoes = useQuery({
    queryKey: ['consignacoes'],
    queryFn: async () => {
      if (!supabase) return []
      return buscarConsignacoes(supabase)
    },
  })

  const extrairTexto = useCallback(
    (c: ConsignacaoComResumo) =>
      [`#${c.numeroSequencial}`, c.Cliente?.nome ?? '', c.status].join(' '),
    [],
  )

  const { termo, setTermo, filtrados } = usePesquisa(consignacoes.data ?? [], extrairTexto, 200)

  const lista = useMemo(
    () => filtrados.filter((c) => filtroStatus === 'todas' || c.status === filtroStatus),
    [filtrados, filtroStatus],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-[var(--texto)]">
          <Handshake className="h-6 w-6 text-secondary-500" /> Consignações
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <CampoPesquisa
          valor={termo}
          onChange={setTermo}
          placeholder="Por #, cliente ou status..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie)] p-1">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltroStatus(f.valor)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                filtroStatus === f.valor
                  ? 'bg-secondary-500/15 text-secondary-600 dark:text-secondary-400'
                  : 'text-[var(--texto-secundario)] hover:bg-[var(--superficie-elevada)]'
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {consignacoes.isLoading ? (
        <p className="mt-6 text-[var(--texto-muted)]">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="mt-6 text-[var(--texto-muted)]">
          Nenhuma consignação encontrada. Consigne um orçamento produzido/finalizado para iniciar.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((c) => {
            const saldo = saldoAReceber(c)
            const nPecas = (c.ConsignacaoItem ?? []).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/admin/consignacoes/${c.id}`)}
                className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 text-left transition hover:bg-[var(--superficie-elevada)]/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--texto-muted)]">#{c.numeroSequencial}</p>
                    <p className="truncate font-medium text-[var(--texto)]">{c.Cliente?.nome ?? '—'}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'aberta'
                        ? 'bg-secondary-500/15 text-secondary-700 dark:text-secondary-300'
                        : 'bg-[var(--superficie-elevada)] text-[var(--texto-muted)]'
                    }`}
                  >
                    {c.status === 'aberta' ? 'Aberta' : 'Encerrada'}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="text-xs text-[var(--texto-muted)]">
                    <p>{nPecas} {nPecas === 1 ? 'peça' : 'peças'}</p>
                    <p>Consignado {formatarMoeda(valorConsignado(c))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--texto-muted)]">Saldo a receber</p>
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        saldo > 0 ? 'text-alerta' : 'text-sucesso'
                      }`}
                    >
                      {formatarMoeda(saldo)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
