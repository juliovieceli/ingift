import { useEffect, useState } from 'react'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { Cliente } from '@/tipos/database'

interface Props {
  aberto: boolean
  cliente: Cliente | null
  onFechar: () => void
  onSalvo: () => void
}

const vazio = {
  nome: '',
  telefone: '',
  email: '',
  documento: '',
  endereco: '',
  observacoes: '',
  ativo: true,
}

export function ModalCliente({ aberto, cliente, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome,
        telefone: cliente.telefone ?? '',
        email: cliente.email ?? '',
        documento: cliente.documento ?? '',
        endereco: cliente.endereco ?? '',
        observacoes: cliente.observacoes ?? '',
        ativo: cliente.ativo,
      })
    } else {
      setForm(vazio)
    }
    setErro('')
  }, [cliente, aberto])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const payload = {
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        documento: form.documento || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
      }
      if (cliente) {
        const { error } = await supabase.from('Cliente').update(payload).eq('id', cliente.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('Cliente').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !cliente) throw new Error('Cliente inválido')
      const { data: orcamentos, error: errBusca } = await supabase
        .from('Orcamento')
        .select('numeroSequencial')
        .eq('clienteId', cliente.id)
      if (errBusca) throw errBusca
      if (orcamentos && orcamentos.length > 0) {
        const nums = orcamentos.map((o) => `#${o.numeroSequencial}`).join(', ')
        throw new Error(
          `Não é possível excluir: cliente possui ${orcamentos.length} orçamento(s) vinculado(s) (${nums}).`,
        )
      }
      if (!confirm(`Excluir cliente "${cliente.nome}"? Esta ação não pode ser desfeita.`)) return
      const { error } = await supabase.from('Cliente').delete().eq('id', cliente.id)
      if (error) throw error
    },
    onSuccess: () => {
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={cliente ? 'Editar cliente' : 'Novo cliente'}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          salvar.mutate()
        }}
        className="flex flex-col gap-3"
      >
        <Input rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <Input rotulo="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <Input rotulo="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input rotulo="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
        <Input rotulo="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Observações</span>
          <textarea
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            onFocus={selecionarTextoAoFocar}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
            rows={2}
          />
        </label>
        {cliente && (
          <Checkbox rotulo="Ativo" checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} />
        )}
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          {cliente ? (
            <button
              type="button"
              onClick={() => excluir.mutate()}
              disabled={excluir.isPending || salvar.isPending}
              className="text-sm text-erro hover:underline disabled:opacity-50"
            >
              {excluir.isPending ? 'Excluindo...' : 'Excluir cliente'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
            <Botao type="submit" disabled={salvar.isPending || excluir.isPending}>
              {salvar.isPending ? 'Salvando...' : 'Salvar'}
            </Botao>
          </div>
        </div>
      </form>
    </Modal>
  )
}
