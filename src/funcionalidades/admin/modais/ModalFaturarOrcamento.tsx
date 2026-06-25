import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { CODIGO_DEFAULT_RECEITA, faturarOrcamento } from '@/lib/financeiro'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroPlanoConta } from '@/tipos/database'

interface Props {
  aberto: boolean
  orcamentoId: string | null
  numeroSequencial?: number
  precoTotal: number
  onFechar: () => void
  onSalvo: () => void
}

export function ModalFaturarOrcamento({
  aberto,
  orcamentoId,
  numeroSequencial,
  precoTotal,
  onFechar,
  onSalvo,
}: Props) {
  const qc = useQueryClient()
  const [planoContaId, setPlanoContaId] = useState('')
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10))
  const [erro, setErro] = useState('')

  const planoContas = useQuery({
    queryKey: ['plano-contas'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('FinanceiroPlanoConta')
        .select('*')
        .eq('ativo', true)
        .eq('tipo', 'receita')
        .order('ordem')
      return (data ?? []) as FinanceiroPlanoConta[]
    },
  })

  useEffect(() => {
    if (!aberto) return
    setDataVencimento(new Date().toISOString().slice(0, 10))
    setErro('')
  }, [aberto])

  useEffect(() => {
    if (!aberto || !planoContas.data?.length || planoContaId) return
    const padrao = planoContas.data.find((c) => c.codigo === CODIGO_DEFAULT_RECEITA)
    setPlanoContaId(padrao?.id ?? planoContas.data[0].id)
  }, [aberto, planoContas.data, planoContaId])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase || !orcamentoId) throw new Error('Orçamento inválido')
      if (!planoContaId) throw new Error('Selecione o plano de contas')

      await faturarOrcamento(supabase, {
        orcamentoId,
        planoContaId,
        vencimento: dataVencimento,
        descricao: `Orçamento #${numeroSequencial ?? ''}`,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamento', orcamentoId] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao faturar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Faturar orçamento" largura="md">
      <div className="mb-4 rounded-lg bg-sucesso/10 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-sucesso/80">Valor a faturar</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-sucesso">
          {formatarMoeda(precoTotal)}
        </p>
        <p className="mt-1 text-xs text-[var(--texto-muted)]">
          O valor é fixo e corresponde ao total do orçamento. Após faturado, o orçamento não poderá
          ter itens ou valores alterados.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Classificar em</span>
          <select
            value={planoContaId}
            onChange={(e) => setPlanoContaId(e.target.value)}
            required
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            <option value="">Selecionar...</option>
            {planoContas.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <Input
          rotulo="Vencimento"
          type="date"
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          required
        />

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Faturando...' : 'Faturar orçamento'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
