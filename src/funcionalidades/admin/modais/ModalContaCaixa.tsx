import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroContaCaixa } from '@/tipos/database'

const TIPOS_CONTA = [
  { id: 'caixa', rotulo: 'Caixa físico' },
  { id: 'banco', rotulo: 'Conta bancária' },
  { id: 'pix', rotulo: 'PIX' },
  { id: 'outro', rotulo: 'Outro' },
] as const

type FormState = {
  nome: string
  tipo: FinanceiroContaCaixa['tipo']
  ativo: boolean
}

const formVazio = (): FormState => ({
  nome: '',
  tipo: 'caixa',
  ativo: true,
})

function criarForm(conta: FinanceiroContaCaixa | null): FormState {
  if (!conta) return formVazio()
  return { nome: conta.nome, tipo: conta.tipo, ativo: conta.ativo }
}

interface Props {
  aberto: boolean
  conta: FinanceiroContaCaixa | null
  onFechar: () => void
  onSalvo: () => void
}

function FormularioContaCaixa({ conta, onFechar, onSalvo }: Omit<Props, 'aberto'>) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => criarForm(conta))
  const [erro, setErro] = useState('')

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!form.nome.trim()) throw new Error('Informe o nome da conta')

      const payload = { nome: form.nome.trim(), tipo: form.tipo, ativo: form.ativo }

      if (conta) {
        const { error } = await supabase
          .from('FinanceiroContaCaixa')
          .update(payload)
          .eq('id', conta.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('FinanceiroContaCaixa').insert(payload)
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !conta) return
      if (!confirm(`Excluir a conta "${conta.nome}"?`)) return
      const { error } = await supabase
        .from('FinanceiroContaCaixa')
        .delete()
        .eq('id', conta.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
      className="flex flex-col gap-4"
    >
      <Input
        rotulo="Nome"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
        required
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Tipo</span>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value as FinanceiroContaCaixa['tipo'] })}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
        >
          {TIPOS_CONTA.map((t) => (
            <option key={t.id} value={t.id}>{t.rotulo}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          className="h-4 w-4 rounded border-[var(--borda)] accent-[var(--primaria)]"
        />
        <span className="text-[var(--texto-secundario)]">Conta ativa</span>
      </label>

      {erro && <p className="text-sm text-erro">{erro}</p>}

      <div className="flex justify-between gap-2 pt-2">
        {conta && (
          <Botao
            type="button"
            variante="fantasma"
            className="text-erro hover:text-erro"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending || salvar.isPending}
          >
            {excluir.isPending ? 'Excluindo...' : 'Excluir'}
          </Botao>
        )}
        <div className="ml-auto flex gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending || excluir.isPending}>
            {salvar.isPending ? 'Salvando...' : conta ? 'Salvar' : 'Criar'}
          </Botao>
        </div>
      </div>
    </form>
  )
}

export function ModalContaCaixa({ aberto, conta, onFechar, onSalvo }: Props) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={conta ? 'Editar conta caixa' : 'Nova conta caixa'}
      largura="md"
    >
      {aberto && (
        <FormularioContaCaixa
          key={conta?.id ?? 'novo'}
          conta={conta}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
