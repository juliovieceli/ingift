import { useEffect, useState } from 'react'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { Material } from '@/tipos/database'

type TipoMov = 'entrada_compra' | 'entrada_manual' | 'perda' | 'ajuste_manual'

const TIPOS: { id: TipoMov; rotulo: string; entrada: boolean }[] = [
  { id: 'entrada_compra', rotulo: 'Entrada (compra)', entrada: true },
  { id: 'entrada_manual', rotulo: 'Entrada manual', entrada: true },
  { id: 'perda', rotulo: 'Perda', entrada: false },
  { id: 'ajuste_manual', rotulo: 'Ajuste de saída', entrada: false },
]

const formVazio = () => ({
  tipoCodigo: 'entrada_compra' as TipoMov,
  materialId: '',
  quantidade: '',
  valorTotal: '',
  fornecedor: '',
  dataMov: new Date().toISOString().slice(0, 10),
  obs: '',
})

interface Props {
  aberto: boolean
  materialIdInicial?: string
  onFechar: () => void
  onSalvo: () => void
}

export function ModalMovimentacaoEstoque({ aberto, materialIdInicial, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState(formVazio)
  const [erro, setErro] = useState('')

  const materiais = useQuery({
    queryKey: ['materiais'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('Material')
        .select('id, nome, unidadeMedida, categoria')
        .eq('ativo', true)
        .order('nome')
      return (data ?? []) as Pick<Material, 'id' | 'nome' | 'unidadeMedida' | 'categoria'>[]
    },
  })

  const tipos = useQuery({
    queryKey: ['tipos-movimentacao'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('EstoqueTipoMovimentacao').select('*')
      return data ?? []
    },
  })

  useEffect(() => {
    if (!aberto) return
    setForm({
      ...formVazio(),
      materialId: materialIdInicial ?? '',
    })
    setErro('')
  }, [aberto, materialIdInicial])

  const tipoAtual = TIPOS.find((t) => t.id === form.tipoCodigo)!
  const matSel = materiais.data?.find((m) => m.id === form.materialId)

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!form.materialId) throw new Error('Selecione o material')
      const qtd = Number(form.quantidade)
      if (!qtd || qtd <= 0) throw new Error('Quantidade inválida')

      const tipoRow = tipos.data?.find((t) => t.codigo === form.tipoCodigo)
      if (!tipoRow) throw new Error('Tipo de movimentação não encontrado')

      const valor = tipoAtual.entrada ? Number(form.valorTotal) : null
      if (tipoAtual.entrada && (valor == null || valor < 0)) {
        throw new Error('Informe o valor total da entrada')
      }

      const { error } = await supabase.from('EstoqueMovimentacao').insert({
        materialId: form.materialId,
        tipoMovimentacaoId: tipoRow.id,
        quantidade: qtd,
        quantidadeG: qtd,
        valorTotal: valor,
        fornecedor: form.fornecedor || null,
        dataMovimentacao: form.dataMov,
        observacoes: form.obs || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao registrar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Registrar movimentação" largura="lg">
      <form
        onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Tipo</span>
          <select
            value={form.tipoCodigo}
            onChange={(e) => setForm({ ...form, tipoCodigo: e.target.value as TipoMov })}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          >
            {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Material</span>
          <select
            value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
            required
          >
            <option value="">Selecionar...</option>
            {materiais.data?.map((m) => (
              <option key={m.id} value={m.id}>{m.nome} ({m.categoria})</option>
            ))}
          </select>
        </label>

        <Input
          rotulo={`Quantidade${matSel ? ` (${matSel.unidadeMedida})` : ''}`}
          type="number"
          min="0.01"
          step="0.01"
          value={form.quantidade}
          onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
          required
        />

        {tipoAtual.entrada && (
          <>
            <Input
              rotulo="Valor total (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.valorTotal}
              onChange={(e) => setForm({ ...form, valorTotal: e.target.value })}
              required
            />
            <Input
              rotulo="Fornecedor"
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
            />
          </>
        )}

        <Input
          rotulo="Data"
          type="date"
          value={form.dataMov}
          onChange={(e) => setForm({ ...form, dataMov: e.target.value })}
        />

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-[var(--texto-secundario)]">Observações</span>
          <textarea
            value={form.obs}
            onChange={(e) => setForm({ ...form, obs: e.target.value })}
            onFocus={selecionarTextoAoFocar}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
            rows={2}
          />
        </label>

        {erro && <p className="text-sm text-erro sm:col-span-2">{erro}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Registrando...' : 'Registrar'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
