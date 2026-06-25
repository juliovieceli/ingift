import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { CODIGO_DEFAULT_DESPESA, CODIGO_DEFAULT_RECEITA } from '@/lib/financeiro'
import type { FinanceiroPlanoConta, FinanceiroTitulo } from '@/tipos/database'

const formVazio = (): FormState => ({
  tipo: 'receita',
  planoContaId: '',
  dataVencimento: new Date().toISOString().slice(0, 10),
  descricao: '',
  fornecedor: '',
  observacoes: '',
})

type FormState = {
  tipo: 'receita' | 'despesa'
  planoContaId: string
  dataVencimento: string
  descricao: string
  fornecedor: string
  observacoes: string
}

interface Props {
  aberto: boolean
  titulo: FinanceiroTitulo | null
  tipoInicial?: 'receita' | 'despesa'
  onFechar: () => void
  onSalvo: () => void
}

export function ModalTituloFinanceiro({ aberto, titulo, tipoInicial, onFechar, onSalvo }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(formVazio)
  const [valor, setValor] = useState('')
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
        .order('tipo')
        .order('ordem')
      return (data ?? []) as FinanceiroPlanoConta[]
    },
  })

  const contasDoTipo = planoContas.data?.filter((c) => c.tipo === form.tipo) ?? []

  useEffect(() => {
    if (!aberto) return
    if (titulo) {
      setForm({
        tipo: titulo.tipo,
        planoContaId: titulo.planoContaId,
        dataVencimento: titulo.dataVencimento,
        descricao: titulo.descricao,
        fornecedor: titulo.fornecedor ?? '',
        observacoes: titulo.observacoes ?? '',
      })
      setValor(String(titulo.valor))
    } else {
      const tipo = tipoInicial ?? 'receita'
      setForm({ ...formVazio(), tipo })
      setValor('')
    }
    setErro('')
  }, [aberto, titulo, tipoInicial])

  // Pré-selecionar default quando o tipo ou a lista muda
  useEffect(() => {
    if (!aberto || titulo || !planoContas.data?.length) return
    const codigoPadrao = form.tipo === 'receita' ? CODIGO_DEFAULT_RECEITA : CODIGO_DEFAULT_DESPESA
    const padrao = planoContas.data.find((c) => c.codigo === codigoPadrao)
    if (padrao && !form.planoContaId) {
      setForm((f) => ({ ...f, planoContaId: padrao.id }))
    }
  }, [aberto, titulo, form.tipo, planoContas.data, form.planoContaId])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!form.planoContaId) throw new Error('Selecione o plano de contas')
      if (!form.descricao.trim()) throw new Error('Informe a descrição')
      const v = Number(valor)
      if (!v || v <= 0) throw new Error('Informe um valor válido')

      const payload = {
        tipo: form.tipo,
        planoContaId: form.planoContaId,
        valor: v,
        dataVencimento: form.dataVencimento,
        descricao: form.descricao.trim(),
        fornecedor: form.fornecedor.trim() || null,
        observacoes: form.observacoes.trim() || null,
      }

      if (titulo) {
        if (Number(titulo.valorBaixado) > 0) throw new Error('Título com baixas não pode ser editado')
        const { error } = await supabase
          .from('FinanceiroTitulo')
          .update(payload)
          .eq('id', titulo.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('FinanceiroTitulo').insert(payload)
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo ? 'Editar título' : 'Novo título financeiro'}
      largura="md"
    >
      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Tipo</span>
          <select
            value={form.tipo}
            onChange={(e) => {
              const tipo = e.target.value as 'receita' | 'despesa'
              setForm({ ...form, tipo, planoContaId: '' })
            }}
            disabled={Boolean(titulo)}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Plano de contas</span>
          <select
            value={form.planoContaId}
            onChange={(e) => setForm({ ...form, planoContaId: e.target.value })}
            required
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            <option value="">Selecionar...</option>
            {contasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <Input
          rotulo="Descrição"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            rotulo="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            disabled={Boolean(titulo && Number(titulo.valorBaixado) > 0)}
          />
          <Input
            rotulo="Vencimento"
            type="date"
            value={form.dataVencimento}
            onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
            required
          />
        </div>

        {form.tipo === 'despesa' && (
          <Input
            rotulo="Fornecedor"
            value={form.fornecedor}
            onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
          />
        )}

        <Input
          rotulo="Observações"
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : titulo ? 'Salvar' : 'Criar'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
