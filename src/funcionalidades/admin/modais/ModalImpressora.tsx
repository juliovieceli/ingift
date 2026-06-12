import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { ImpressoraConfiguracao } from '@/tipos/database'

interface Props {
  aberto: boolean
  impressora: ImpressoraConfiguracao | null
  onFechar: () => void
  onSalvo: () => void
}

const padrao = {
  nome: 'Nova impressora',
  modelo: '',
  consumoKwh: 0.15,
  precoKwh: 0.85,
  valorMaquina: 3500,
  vidaUtilHoras: 5000,
  margemMultiplicador: 2.5,
  taxaFalha: 0.15,
  taxaMarketplace: 0,
  custoEmbalagem: 0,
  custoFrete: 0,
  custoAcabamento: 0,
  outrosFixos: 0,
  ativo: true,
}

export function ModalImpressora({ aberto, impressora, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState(padrao)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (impressora) {
      setForm({
        nome: impressora.nome,
        modelo: impressora.modelo ?? '',
        consumoKwh: Number(impressora.consumoKwh),
        precoKwh: Number(impressora.precoKwh),
        valorMaquina: Number(impressora.valorMaquina),
        vidaUtilHoras: Number(impressora.vidaUtilHoras),
        margemMultiplicador: Number(impressora.margemMultiplicador),
        taxaFalha: Number(impressora.taxaFalha),
        taxaMarketplace: Number(impressora.taxaMarketplace),
        custoEmbalagem: Number(impressora.custoEmbalagem),
        custoFrete: Number(impressora.custoFrete),
        custoAcabamento: Number(impressora.custoAcabamento),
        outrosFixos: Number(impressora.outrosFixos),
        ativo: impressora.ativo,
      })
    } else {
      setForm(padrao)
    }
    setErro('')
  }, [impressora, aberto])

  const num = (campo: keyof typeof padrao, v: string) =>
    setForm({ ...form, [campo]: +v })

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const payload = { ...form, modelo: form.modelo || null }
      if (impressora) {
        const { error } = await supabase.from('ImpressoraConfiguracao').update(payload).eq('id', impressora.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ImpressoraConfiguracao').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !impressora) throw new Error('Impressora inválida')

      const { data: orcamentos, error: errOrc } = await supabase
        .from('Orcamento')
        .select('numeroSequencial')
        .eq('configuracaoImpressoraId', impressora.id)
      if (errOrc) throw errOrc
      if (orcamentos && orcamentos.length > 0) {
        const nums = orcamentos.map((o) => `#${o.numeroSequencial}`).join(', ')
        throw new Error(
          `Não é possível excluir: impressora vinculada a ${orcamentos.length} orçamento(s) (${nums}).`,
        )
      }

      if (!confirm(`Excluir impressora "${impressora.nome}"? Esta ação não pode ser desfeita.`)) return
      const { error } = await supabase.from('ImpressoraConfiguracao').delete().eq('id', impressora.id)
      if (error) throw error
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={impressora ? 'Editar impressora' : 'Nova impressora'} largura="xl">
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <Input rotulo="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
        </div>
        <Checkbox rotulo="Ativa" checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} />

        <p className="text-xs font-medium text-[var(--texto-muted)]">Máquina / Energia</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Input rotulo="Consumo (kWh)" type="number" step="0.01" value={form.consumoKwh} onChange={(e) => num('consumoKwh', e.target.value)} />
          <Input rotulo="Preço kWh (R$)" type="number" step="0.01" value={form.precoKwh} onChange={(e) => num('precoKwh', e.target.value)} />
          <Input rotulo="Valor máquina (R$)" type="number" value={form.valorMaquina} onChange={(e) => num('valorMaquina', e.target.value)} />
          <Input rotulo="Vida útil (h)" type="number" value={form.vidaUtilHoras} onChange={(e) => num('vidaUtilHoras', e.target.value)} />
        </div>

        <p className="text-xs font-medium text-[var(--texto-muted)]">Margens e taxas</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <Input rotulo="Margem (mult.)" type="number" step="0.1" value={form.margemMultiplicador} onChange={(e) => num('margemMultiplicador', e.target.value)} />
          <Input rotulo="Taxa falha" type="number" step="0.01" value={form.taxaFalha} onChange={(e) => num('taxaFalha', e.target.value)} />
          <Input rotulo="Taxa marketplace" type="number" step="0.01" value={form.taxaMarketplace} onChange={(e) => num('taxaMarketplace', e.target.value)} />
        </div>

        <p className="text-xs font-medium text-[var(--texto-muted)]">Logística (custos fixos)</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Input rotulo="Embalagem (R$)" type="number" step="0.01" value={form.custoEmbalagem} onChange={(e) => num('custoEmbalagem', e.target.value)} />
          <Input rotulo="Frete (R$)" type="number" step="0.01" value={form.custoFrete} onChange={(e) => num('custoFrete', e.target.value)} />
          <Input rotulo="Acabamento (R$)" type="number" step="0.01" value={form.custoAcabamento} onChange={(e) => num('custoAcabamento', e.target.value)} />
          <Input rotulo="Outros fixos (R$)" type="number" step="0.01" value={form.outrosFixos} onChange={(e) => num('outrosFixos', e.target.value)} />
        </div>

        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex items-center justify-between gap-2">
          {impressora ? (
            <button
              type="button"
              onClick={() => excluir.mutate()}
              disabled={excluir.isPending || salvar.isPending}
              className="text-sm text-erro hover:underline disabled:opacity-50"
            >
              {excluir.isPending ? 'Excluindo...' : 'Excluir impressora'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
            <Botao type="submit" disabled={salvar.isPending || excluir.isPending}>Salvar</Botao>
          </div>
        </div>
      </form>
    </Modal>
  )
}
