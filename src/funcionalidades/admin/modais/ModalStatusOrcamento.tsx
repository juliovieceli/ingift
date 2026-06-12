import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { OrcamentoStatus } from '@/tipos/database'

interface Props {
  aberto: boolean
  status: OrcamentoStatus | null
  onFechar: () => void
  onSalvo: () => void
}

const vazio = {
  codigo: '',
  nome: '',
  ordem: 0,
  cor: '',
  ativo: true,
  travaEdicao: false,
  reservaEstoque: false,
  baixaEstoque: false,
  liberaReserva: false,
}

export function ModalStatusOrcamento({ aberto, status, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (status) {
      setForm({
        codigo: status.codigo,
        nome: status.nome,
        ordem: status.ordem,
        cor: status.cor ?? '',
        ativo: status.ativo,
        travaEdicao: status.travaEdicao,
        reservaEstoque: status.reservaEstoque,
        baixaEstoque: status.baixaEstoque,
        liberaReserva: status.liberaReserva,
      })
    } else {
      setForm(vazio)
    }
    setErro('')
  }, [status, aberto])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const payload = {
        nome: form.nome,
        ordem: form.ordem,
        cor: form.cor || null,
        ativo: form.ativo,
        travaEdicao: form.travaEdicao,
        reservaEstoque: form.reservaEstoque,
        baixaEstoque: form.baixaEstoque,
        liberaReserva: form.liberaReserva,
        ...(status ? {} : { codigo: form.codigo }),
      }
      if (status) {
        const { error } = await supabase.from('OrcamentoStatus').update(payload).eq('id', status.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('OrcamentoStatus').insert({ ...payload, codigo: form.codigo })
        if (error) throw error
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={status ? 'Editar status' : 'Novo status'}>
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="flex flex-col gap-3">
        <Input
          rotulo="Código"
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          disabled={Boolean(status)}
          required
        />
        <Input rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <Input rotulo="Ordem" type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: +e.target.value })} />
        <Input rotulo="Cor (hex ou nome)" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
        <Checkbox rotulo="Ativo" checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} />
        <Checkbox rotulo="Reserva estoque" checked={form.reservaEstoque} onChange={(v) => setForm({ ...form, reservaEstoque: v })} />
        <Checkbox rotulo="Baixa estoque" checked={form.baixaEstoque} onChange={(v) => setForm({ ...form, baixaEstoque: v })} />
        <Checkbox rotulo="Libera reserva" checked={form.liberaReserva} onChange={(v) => setForm({ ...form, liberaReserva: v })} />
        <Checkbox rotulo="Trava edição" checked={form.travaEdicao} onChange={(v) => setForm({ ...form, travaEdicao: v })} />
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvar.isPending}>Salvar</Botao>
        </div>
      </form>
    </Modal>
  )
}
