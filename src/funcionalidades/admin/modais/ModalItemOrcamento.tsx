import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  calcularPeca,
  configDeDadosCalculo,
  type PecaCalculo,
  type ResultadoPeca,
} from '@/lib/calculadora'
import { salvarOrcamentoItem } from '@/lib/orcamento'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { FormularioPecaOrcamento, pecaVazia } from '@/funcionalidades/admin/FormularioPecaOrcamento'
import { SeletorImpressoraCalculo } from '@/funcionalidades/admin/SeletorImpressoraCalculo'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'
import type { ImpressoraConfiguracao, Material } from '@/tipos/database'

interface Props {
  aberto: boolean
  orcamentoId: string
  ordemInicial: number
  impressoraIdInicial?: string | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalItemOrcamento({
  aberto,
  orcamentoId,
  ordemInicial,
  impressoraIdInicial,
  onFechar,
  onSalvo,
}: Props) {
  const { config } = useImpressoraCalculo()
  const [peca, setPeca] = useState<PecaCalculo>(pecaVazia())
  const [resultado, setResultado] = useState<ResultadoPeca | null>(null)
  const [erro, setErro] = useState('')

  const dadosCalculo = useQuery({
    queryKey: ['orcamento-calculo', orcamentoId],
    enabled: aberto && Boolean(orcamentoId),
    queryFn: async () => {
      if (!supabase) return null
      const { data } = await supabase.from('OrcamentoDadosCalculo').select('*').eq('orcamentoId', orcamentoId).single()
      return data
    },
  })

  const impressoras = useQuery({
    queryKey: ['impressoras'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('ImpressoraConfiguracao').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as ImpressoraConfiguracao[]
    },
  })

  const materiais = useQuery({
    queryKey: ['materiais'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Material').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as Material[]
    },
  })

  useEffect(() => {
    if (!aberto) return
    setPeca(pecaVazia())
    setResultado(null)
    setErro('')
  }, [aberto])

  useEffect(() => {
    if (!aberto || !impressoras.data) return

    const idAlvo = impressoraIdInicial ?? dadosCalculo.data?.configuracaoImpressoraId ?? null
    const imp = idAlvo ? impressoras.data.find((i) => i.id === idAlvo) : undefined

    if (imp) {
      impressoraCalculoStore.aplicarImpressora(imp)
    } else if (dadosCalculo.data) {
      impressoraCalculoStore.definir({
        impressoraId: '',
        config: configDeDadosCalculo(dadosCalculo.data as {
          dadosImpressora?: Record<string, number>
          dadosMargensTaxas?: Record<string, number>
          dadosLogistica?: Record<string, number>
        }),
      })
    }
  }, [aberto, impressoraIdInicial, dadosCalculo.data, impressoras.data])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!peca.nomePeca.trim()) throw new Error('Informe o nome da peça')
      const r = resultado ?? calcularPeca(config, peca)
      await salvarOrcamentoItem(supabase, orcamentoId, peca, r, ordemInicial)
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Adicionar item ao orçamento" largura="xl">
      <div className="space-y-4">
        <SeletorImpressoraCalculo onAlterar={() => setResultado(null)} />
        <FormularioPecaOrcamento
          config={config}
          peca={peca}
          onChange={(p) => { setPeca(p); setResultado(null) }}
          resultado={resultado}
          onResultado={setResultado}
          materiais={materiais.data ?? []}
        />
      </div>
      {erro && <p className="mt-2 text-sm text-erro">{erro}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        <Botao
          type="button"
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending || !peca.nomePeca.trim()}
        >
          {salvar.isPending ? 'Salvando...' : 'Salvar item'}
        </Botao>
      </div>
    </Modal>
  )
}
