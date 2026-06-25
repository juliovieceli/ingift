import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { registrarBaixaTitulo, saldoPendente } from '@/lib/financeiro'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroContaCaixa, FinanceiroTitulo } from '@/tipos/database'

interface Props {
  aberto: boolean
  titulo: FinanceiroTitulo | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalBaixaTitulo({ aberto, titulo, onFechar, onSalvo }: Props) {
  const qc = useQueryClient()
  const [contaId, setContaId] = useState('')
  const [valor, setValor] = useState('')
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().slice(0, 10))
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')

  const contasCaixa = useQuery({
    queryKey: ['contas-caixa'],
    enabled: aberto,
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

  useEffect(() => {
    if (!aberto || !titulo) return
    const saldo = saldoPendente(titulo)
    setValor(saldo.toFixed(2))
    setDataBaixa(new Date().toISOString().slice(0, 10))
    setObs('')
    setErro('')
    // pré-selecionar primeira conta
    if (contasCaixa.data?.length) setContaId(contasCaixa.data[0].id)
  }, [aberto, titulo, contasCaixa.data])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase || !titulo) throw new Error('Dados inválidos')
      if (!contaId) throw new Error('Selecione a conta de destino')
      const v = Number(valor)
      if (!v || v <= 0) throw new Error('Informe um valor válido')
      const saldo = saldoPendente(titulo)
      if (v > saldo) throw new Error(`Valor supera o saldo pendente de ${formatarMoeda(saldo)}`)

      await registrarBaixaTitulo(supabase, {
        tituloId: titulo.id,
        contaId,
        valor: v,
        dataBaixa,
        obs: obs.trim() || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao registrar baixa'),
  })

  if (!titulo) return null

  const saldo = saldoPendente(titulo)

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Registrar baixa" largura="md">
      <div className="mb-4 rounded-lg bg-[var(--fundo)] px-4 py-3 text-sm">
        <p className="font-medium text-[var(--texto)]">{titulo.descricao}</p>
        <p className="mt-1 text-[var(--texto-secundario)]">
          Saldo pendente: <strong className="text-[var(--texto)]">{formatarMoeda(saldo)}</strong>
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Conta de destino</span>
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            required
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            <option value="">Selecionar...</option>
            {contasCaixa.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {formatarMoeda(c.saldoAtual)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Input
            rotulo="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            max={saldo.toFixed(2)}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
          <Input
            rotulo="Data da baixa"
            type="date"
            value={dataBaixa}
            onChange={(e) => setDataBaixa(e.target.value)}
            required
          />
        </div>

        <Input
          rotulo="Observações"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Registrando...' : 'Registrar baixa'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
