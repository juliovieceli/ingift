import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { CODIGO_DEFAULT_RECEITA } from '@/lib/financeiro'
import { faturarConsignacao } from '@/lib/consignacao'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroContaCaixa, FinanceiroPlanoConta } from '@/tipos/database'

interface FormProps {
  consignacaoId: string
  saldo: number
  onFechar: () => void
  onSalvo: () => void
}

function FormularioFaturarConsignacao({ consignacaoId, saldo, onFechar, onSalvo }: FormProps) {
  const qc = useQueryClient()
  const [planoContaId, setPlanoContaId] = useState('')
  const [contaCaixaId, setContaCaixaId] = useState('')
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().slice(0, 10))
  const [valor, setValor] = useState(saldo > 0 ? saldo.toFixed(2) : '')
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

  const contasCaixa = useQuery({
    queryKey: ['contas-caixa'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('FinanceiroContaCaixa')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      return (data ?? []) as FinanceiroContaCaixa[]
    },
  })

  const padraoPlanoId =
    planoContas.data?.find((c) => c.codigo === CODIGO_DEFAULT_RECEITA)?.id
    ?? planoContas.data?.[0]?.id
    ?? ''
  const planoSelecionado = planoContaId || padraoPlanoId
  const contaSelecionada = contaCaixaId || contasCaixa.data?.[0]?.id || ''

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Consignação inválida')
      if (!planoSelecionado) throw new Error('Selecione o plano de contas')
      if (!contaSelecionada) throw new Error('Selecione a conta caixa que receberá o valor')
      const valorNum = Number(valor)
      if (!Number.isFinite(valorNum) || valorNum <= 0) throw new Error('Informe um valor válido')
      if (valorNum > saldo + 0.001) {
        throw new Error(`Valor supera o saldo a receber (${formatarMoeda(saldo)})`)
      }

      await faturarConsignacao(supabase, {
        consignacaoId,
        planoContaId: planoSelecionado,
        contaCaixaId: contaSelecionada,
        dataRecebimento,
        valor: valorNum,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignacao', consignacaoId] })
      qc.invalidateQueries({ queryKey: ['consignacao-recebimentos', consignacaoId] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao faturar'),
  })

  return (
    <>
      <div className="mb-4 rounded-lg bg-sucesso/10 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-sucesso/80">Saldo a receber</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-sucesso">{formatarMoeda(saldo)}</p>
        <p className="mt-1 text-xs text-[var(--texto-muted)]">
          O faturamento entra direto no caixa (baixa imediata). Informe o valor total ou um valor parcial.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="flex flex-col gap-4"
      >
        <Input
          rotulo="Valor a receber"
          type="number"
          step="0.01"
          min="0"
          max={saldo.toFixed(2)}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Conta caixa (onde o dinheiro entra)</span>
          <select
            value={contaSelecionada}
            onChange={(e) => setContaCaixaId(e.target.value)}
            required
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            <option value="">Selecionar...</option>
            {contasCaixa.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

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
          rotulo="Data do recebimento"
          type="date"
          value={dataRecebimento}
          onChange={(e) => setDataRecebimento(e.target.value)}
          required
        />

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Faturando...' : 'Faturar e receber'}
          </Botao>
        </div>
      </form>
    </>
  )
}

interface Props {
  aberto: boolean
  consignacaoId: string | null
  saldo: number
  onFechar: () => void
  onSalvo: () => void
}

export function ModalFaturarConsignacao({ aberto, consignacaoId, saldo, onFechar, onSalvo }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Faturar consignação" largura="md">
      {aberto && consignacaoId && (
        <FormularioFaturarConsignacao
          key={consignacaoId}
          consignacaoId={consignacaoId}
          saldo={saldo}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
