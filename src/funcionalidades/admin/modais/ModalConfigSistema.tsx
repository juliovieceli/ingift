import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { Database } from '@/tipos/database'

type ConfigSistema = Database['public']['Tables']['SistemaConfiguracao']['Row']

interface Props {
  aberto: boolean
  config: ConfigSistema | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalConfigSistema({ aberto, config, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState({
    validadeOrcamentoDias: 15,
    templateMargemMultiplicador: 2.5,
    templateTaxaFalha: 0.15,
    templateTaxaMarketplace: 0,
    templateCustoEmbalagem: 0,
    templateCustoFrete: 0,
    templateCustoAcabamento: 0,
    templateOutrosFixos: 0,
  })
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (config) {
      setForm({
        validadeOrcamentoDias: config.validadeOrcamentoDias,
        templateMargemMultiplicador: Number(config.templateMargemMultiplicador),
        templateTaxaFalha: Number(config.templateTaxaFalha),
        templateTaxaMarketplace: Number(config.templateTaxaMarketplace),
        templateCustoEmbalagem: Number(config.templateCustoEmbalagem),
        templateCustoFrete: Number(config.templateCustoFrete),
        templateCustoAcabamento: Number(config.templateCustoAcabamento),
        templateOutrosFixos: Number(config.templateOutrosFixos),
      })
    }
    setErro('')
  }, [config, aberto])

  const num = (campo: keyof typeof form, v: string) => setForm({ ...form, [campo]: +v })

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const { error } = await supabase.from('SistemaConfiguracao').update(form).eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Editar configurações do sistema" largura="lg">
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
        <Input rotulo="Validade orçamento (dias)" type="number" value={form.validadeOrcamentoDias} onChange={(e) => num('validadeOrcamentoDias', e.target.value)} />
        <p className="text-xs font-medium text-[var(--texto-muted)]">Templates padrão (calculadora)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input rotulo="Margem" type="number" step="0.1" value={form.templateMargemMultiplicador} onChange={(e) => num('templateMargemMultiplicador', e.target.value)} />
          <Input rotulo="Taxa falha" type="number" step="0.01" value={form.templateTaxaFalha} onChange={(e) => num('templateTaxaFalha', e.target.value)} />
          <Input rotulo="Taxa marketplace" type="number" step="0.01" value={form.templateTaxaMarketplace} onChange={(e) => num('templateTaxaMarketplace', e.target.value)} />
        </div>
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvar.isPending}>Salvar</Botao>
        </div>
      </form>
    </Modal>
  )
}
