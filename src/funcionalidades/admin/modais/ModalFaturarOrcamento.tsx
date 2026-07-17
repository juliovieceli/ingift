import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import {
  CODIGO_DEFAULT_RECEITA,
  faturarOrcamento,
  type FreteResponsavel,
} from '@/lib/financeiro'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroPlanoConta, OrcamentoItem } from '@/tipos/database'

interface FormProps {
  orcamentoId: string
  numeroSequencial?: number
  precoTotal: number
  onFechar: () => void
  onSalvo: () => void
}

function FormularioFaturarOrcamento({
  orcamentoId,
  numeroSequencial,
  precoTotal,
  onFechar,
  onSalvo,
}: FormProps) {
  const qc = useQueryClient()
  const [planoContaId, setPlanoContaId] = useState('')
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10))
  const [freteResponsavel, setFreteResponsavel] = useState<FreteResponsavel | ''>('')
  const [erro, setErro] = useState('')

  const planoContas = useQuery({
    queryKey: ['plano-contas'],
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

  const itensFrete = useQuery({
    queryKey: ['orcamento-itens-frete', orcamentoId],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('OrcamentoItem')
        .select('id, nomePeca, precoFinal, ehFrete')
        .eq('orcamentoId', orcamentoId)
        .eq('ehFrete', true)
      return (data ?? []) as Pick<OrcamentoItem, 'id' | 'nomePeca' | 'precoFinal' | 'ehFrete'>[]
    },
  })

  const valorFrete = (itensFrete.data ?? []).reduce(
    (acc, i) => acc + Number(i.precoFinal),
    0,
  )
  const temFrete = valorFrete > 0
  const freteCarregando = itensFrete.isLoading

  const padraoId =
    planoContas.data?.find((c) => c.codigo === CODIGO_DEFAULT_RECEITA)?.id
    ?? planoContas.data?.[0]?.id
    ?? ''
  const planoSelecionado = planoContaId || padraoId

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Orçamento inválido')
      if (!planoSelecionado) throw new Error('Selecione o plano de contas')
      if (freteCarregando) throw new Error('Aguarde o carregamento do frete')
      if (temFrete && !freteResponsavel) {
        throw new Error('Informe se o frete é por conta do cliente ou da empresa')
      }

      await faturarOrcamento(supabase, {
        orcamentoId,
        planoContaId: planoSelecionado,
        vencimento: dataVencimento,
        descricao: `Orçamento #${numeroSequencial ?? ''}`,
        freteResponsavel: temFrete ? (freteResponsavel as FreteResponsavel) : null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamento', orcamentoId] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      qc.invalidateQueries({ queryKey: ['titulos-financeiro-orcamento', orcamentoId] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao faturar'),
  })

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="rounded-lg bg-sucesso/10 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-sucesso/80">
            Contas a receber
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sucesso">
            {formatarMoeda(precoTotal)}
          </p>
          <p className="mt-1 text-xs text-[var(--texto-muted)]">
            Valor integral do orçamento. Após faturado, itens e valores ficam bloqueados.
          </p>
        </div>

        {temFrete && (
          <div className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--texto-muted)]">
              Frete (contas a pagar)
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--texto)]">
              {formatarMoeda(valorFrete)}
            </p>
            <p className="mt-1 text-xs text-[var(--texto-muted)]">
              Entra como despesa para a projeção refletir o líquido, sem alterar o valor da venda.
            </p>
            <fieldset className="mt-3 space-y-2">
              <legend className="text-sm text-[var(--texto-secundario)]">Por conta de</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="freteResponsavel"
                  value="cliente"
                  checked={freteResponsavel === 'cliente'}
                  onChange={() => setFreteResponsavel('cliente')}
                  required
                />
                Cliente
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="freteResponsavel"
                  value="empresa"
                  checked={freteResponsavel === 'empresa'}
                  onChange={() => setFreteResponsavel('empresa')}
                  required
                />
                Empresa
              </label>
            </fieldset>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Classificar receita em</span>
          <select
            value={planoSelecionado}
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
          <Botao type="submit" disabled={salvar.isPending || freteCarregando || (temFrete && !freteResponsavel)}>
            {salvar.isPending ? 'Faturando...' : 'Faturar orçamento'}
          </Botao>
        </div>
      </form>
    </>
  )
}

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
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Faturar orçamento" largura="md">
      {aberto && orcamentoId && (
        <FormularioFaturarOrcamento
          key={orcamentoId}
          orcamentoId={orcamentoId}
          numeroSequencial={numeroSequencial}
          precoTotal={precoTotal}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
