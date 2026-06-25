import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { FinanceiroPlanoConta } from '@/tipos/database'

const formVazio = (): FormState => ({
  nome: '',
  tipo: 'receita',
  ordem: '0',
  ativo: true,
})

type FormState = {
  nome: string
  tipo: 'receita' | 'despesa'
  ordem: string
  ativo: boolean
}

interface Props {
  aberto: boolean
  conta: FinanceiroPlanoConta | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalPlanoConta({ aberto, conta, onFechar, onSalvo }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(formVazio)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    if (conta) {
      setForm({
        nome: conta.nome,
        tipo: conta.tipo,
        ordem: String(conta.ordem),
        ativo: conta.ativo,
      })
    } else {
      setForm(formVazio())
    }
    setErro('')
  }, [aberto, conta])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!form.nome.trim()) throw new Error('Informe o nome da conta')

      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
      }

      if (conta) {
        const { error } = await supabase
          .from('FinanceiroPlanoConta')
          .update(payload)
          .eq('id', conta.id)
        if (error) throw new Error(error.message)
      } else {
        const codigo = `${form.tipo}_${Date.now()}`
        const { error } = await supabase
          .from('FinanceiroPlanoConta')
          .insert({ ...payload, codigo })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plano-contas'] })
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
        .from('FinanceiroPlanoConta')
        .delete()
        .eq('id', conta.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plano-contas'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={conta ? 'Editar conta' : 'Nova conta'}
      largura="md"
    >
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
            onChange={(e) => setForm({ ...form, tipo: e.target.value as 'receita' | 'despesa' })}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
            disabled={Boolean(conta)}
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          {conta && (
            <p className="text-xs text-[var(--texto-muted)]">
              O tipo não pode ser alterado após criação.
            </p>
          )}
        </label>

        <Input
          rotulo="Ordem"
          type="number"
          min="0"
          value={form.ordem}
          onChange={(e) => setForm({ ...form, ordem: e.target.value })}
        />

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
    </Modal>
  )
}
