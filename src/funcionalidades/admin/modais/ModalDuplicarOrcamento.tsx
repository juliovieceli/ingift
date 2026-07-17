import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { duplicarOrcamento } from '@/lib/orcamento'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'

export type ItemDuplicavel = {
  id: string
  nomePeca: string
  precoFinal: number
  precoTotal: number
  tipoItem: string
  ehFrete: boolean
}

interface FormProps {
  orcamentoId: string
  clienteAtualId: string
  itens: ItemDuplicavel[]
  onFechar: () => void
}

function FormularioDuplicar({ orcamentoId, clienteAtualId, itens, onFechar }: FormProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [clienteId, setClienteId] = useState(clienteAtualId)
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(itens.map((i) => i.id)))
  const [erro, setErro] = useState('')

  const clientes = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Cliente').select('id, nome').eq('ativo', true).order('nome')
      return (data ?? []) as { id: string; nome: string }[]
    },
  })

  const toggle = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const todosMarcados = itens.length > 0 && selecionados.size === itens.length
  const alternarTodos = () => {
    setSelecionados(todosMarcados ? new Set() : new Set(itens.map((i) => i.id)))
  }

  const totalSelecionado = useMemo(
    () => itens.filter((i) => selecionados.has(i.id)).reduce((s, i) => s + (Number(i.precoFinal ?? i.precoTotal) || 0), 0),
    [itens, selecionados],
  )

  const duplicar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Orçamento inválido')
      if (!clienteId) throw new Error('Selecione o cliente')
      if (selecionados.size === 0) throw new Error('Selecione ao menos um item')
      return duplicarOrcamento(supabase, {
        orcamentoOrigemId: orcamentoId,
        clienteId,
        itemIds: [...selecionados],
      })
    },
    onSuccess: (novoId) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      onFechar()
      navigate(`/admin/orcamentos/${novoId}`)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao duplicar'),
  })

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Cliente do novo orçamento</span>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
        >
          <option value="">Selecionar...</option>
          {clientes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}{c.id === clienteAtualId ? ' (atual)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-[var(--texto-secundario)]">Itens a duplicar</span>
          <button
            type="button"
            onClick={alternarTodos}
            className="text-xs text-secondary-600 hover:underline"
          >
            {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-[var(--texto-muted)]">Este orçamento não tem itens.</p>
        ) : (
          <ul className="max-h-64 divide-y divide-[var(--borda)] overflow-y-auto rounded-lg border border-[var(--borda)]">
            {itens.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--superficie-elevada)]/50">
                  <input
                    type="checkbox"
                    checked={selecionados.has(i.id)}
                    onChange={() => toggle(i.id)}
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 flex-1 truncate text-[var(--texto)]">
                    {i.nomePeca}
                    {i.ehFrete && <span className="ml-1 text-xs text-[var(--texto-muted)]">(frete)</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--texto-muted)]">
                    {formatarMoeda(Number(i.precoFinal ?? i.precoTotal) || 0)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-[var(--superficie-elevada)]/50 px-4 py-2 text-sm">
        <span className="text-[var(--texto-muted)]">
          {selecionados.size} de {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </span>
        <strong className="tabular-nums text-[var(--texto)]">{formatarMoeda(totalSelecionado)}</strong>
      </div>

      {erro && <p className="text-sm text-erro">{erro}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        <Botao
          type="button"
          onClick={() => duplicar.mutate()}
          disabled={duplicar.isPending || selecionados.size === 0 || !clienteId}
        >
          {duplicar.isPending ? 'Duplicando...' : 'Duplicar orçamento'}
        </Botao>
      </div>
    </div>
  )
}

interface Props {
  aberto: boolean
  orcamentoId: string | null
  clienteAtualId: string
  itens: ItemDuplicavel[]
  onFechar: () => void
}

export function ModalDuplicarOrcamento({ aberto, orcamentoId, clienteAtualId, itens, onFechar }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Duplicar orçamento" largura="md">
      {aberto && orcamentoId && (
        <FormularioDuplicar
          orcamentoId={orcamentoId}
          clienteAtualId={clienteAtualId}
          itens={itens}
          onFechar={onFechar}
        />
      )}
    </Modal>
  )
}
