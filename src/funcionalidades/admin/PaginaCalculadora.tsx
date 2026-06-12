import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Card, TituloCard } from '@/componentes/ui/Card'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { ModalPecaCalculadora } from '@/funcionalidades/admin/modais/ModalPecaCalculadora'
import {
  agregarResultados,
  formatarMoeda,
  type ConfigOperacional,
  type PecaSessao,
} from '@/lib/calculadora'
import { salvarOrcamentoItem } from '@/lib/orcamento'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'
import type { Material } from '@/tipos/database'

export function PaginaCalculadora() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { impressoraId, config } = useImpressoraCalculo()
  const [clienteId, setClienteId] = useState('')
  const [pecasSessao, setPecasSessao] = useState<PecaSessao[]>([])
  const [modalPeca, setModalPeca] = useState<{ aberto: boolean; item: PecaSessao | null }>({
    aberto: false,
    item: null,
  })
  const [gerando, setGerando] = useState(false)
  const [msg, setMsg] = useState('')

  const impressoras = useQuery({
    queryKey: ['impressoras'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('ImpressoraConfiguracao').select('id, nome').eq('ativo', true).order('nome')
      return (data ?? []) as { id: string; nome: string }[]
    },
  })

  const materiais = useQuery({
    queryKey: ['materiais'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Material').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as Material[]
    },
  })

  const impressoraNome = impressoras.data?.find((i) => i.id === impressoraId)?.nome

  const atualizarConfig = (campo: keyof ConfigOperacional, valor: number) => {
    impressoraCalculoStore.setConfig({ ...config, [campo]: valor })
  }

  const salvarPadrao = async () => {
    if (!supabase || !impressoraId) return
    await supabase.from('ImpressoraConfiguracao').update({
      consumoKwh: config.consumoKwh,
      precoKwh: config.precoKwh,
      valorMaquina: config.valorMaquina,
      vidaUtilHoras: config.vidaUtilHoras,
      margemMultiplicador: config.margemMultiplicador,
      taxaFalha: config.taxaFalha,
      taxaMarketplace: config.taxaMarketplace,
      custoEmbalagem: config.custoEmbalagem,
      custoFrete: config.custoFrete,
      custoAcabamento: config.custoAcabamento,
      outrosFixos: config.outrosFixos,
    }).eq('id', impressoraId)
    qc.invalidateQueries({ queryKey: ['impressoras'] })
  }

  const salvarPeca = (item: PecaSessao) => {
    setPecasSessao((lista) => {
      const idx = lista.findIndex((p) => p.id === item.id)
      if (idx >= 0) {
        const nova = [...lista]
        nova[idx] = item
        return nova
      }
      return [...lista, item]
    })
    setMsg('')
  }

  const removerPeca = (id: string) => {
    setPecasSessao((lista) => lista.filter((p) => p.id !== id))
  }

  const totaisSessao = agregarResultados(pecasSessao.map((p) => p.resultado))

  const linhasPecas = pecasSessao.map((item) => ({
    id: item.id,
    nomePeca: item.peca.nomePeca,
    quantidade: item.peca.quantidade,
    tempo: `${item.peca.tempoHoras}h ${item.peca.tempoMinutos}min`,
    pesoTotalG: item.resultado.pesoTotalG,
    precoUnitario: item.resultado.precoUnitario,
    precoTotal: item.resultado.precoTotal,
    item,
  }))

  const clientes = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Cliente').select('id, nome').eq('ativo', true).order('nome')
      return (data ?? []) as { id: string; nome: string }[]
    },
  })

  const gerarOrcamento = async () => {
    if (!supabase || pecasSessao.length === 0 || !clienteId) {
      setMsg('Adicione ao menos uma peça à sessão e selecione o cliente.')
      return
    }
    setGerando(true)
    setMsg('')
    try {
      const { data: status } = await supabase
        .from('OrcamentoStatus')
        .select('id')
        .eq('codigo', 'em_digitacao')
        .single()
      if (!status) throw new Error('Status em_digitacao não encontrado')

      const totais = agregarResultados(pecasSessao.map((p) => p.resultado))
      const custoSubtotal = totais.custoMaterial + totais.custoEnergia + totais.custoDepreciacao

      const { data: orc, error: errOrc } = await supabase
        .from('Orcamento')
        .insert({
          clienteId,
          statusOrcamentoId: (status as { id: string }).id,
          configuracaoImpressoraId: impressoraId || null,
          custoSubtotal,
          precoTotal: totais.precoTotal,
        })
        .select('id')
        .single()
      if (errOrc || !orc) throw errOrc ?? new Error('Falha ao criar orçamento')

      const orcId = (orc as { id: string }).id

      for (const [ordem, { peca: p, resultado: r }] of pecasSessao.entries()) {
        await salvarOrcamentoItem(supabase, orcId, p, r, ordem)
      }

      await supabase.from('OrcamentoDadosCalculo').insert({
        orcamentoId: orcId,
        configuracaoImpressoraId: impressoraId || null,
        dadosImpressora: {
          consumoKwh: config.consumoKwh,
          precoKwh: config.precoKwh,
          valorMaquina: config.valorMaquina,
          vidaUtilHoras: config.vidaUtilHoras,
        },
        dadosMargensTaxas: {
          margemMultiplicador: config.margemMultiplicador,
          taxaFalha: config.taxaFalha,
          taxaMarketplace: config.taxaMarketplace,
        },
        dadosLogistica: {
          custoEmbalagem: config.custoEmbalagem,
          custoFrete: config.custoFrete,
          custoAcabamento: config.custoAcabamento,
          outrosFixos: config.outrosFixos,
        },
        pecasCalculadas: pecasSessao.map(({ peca: p, resultado: r }) => ({ ...p, resultado: r })),
        resumoTotais: totais,
      })

      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      navigate(`/admin/orcamentos/${orcId}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erro ao gerar orçamento')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--texto)]">Calculadora de preço</h2>

      <Card>
        <TituloCard>Configuração operacional do orçamento</TituloCard>
        {impressoraNome ? (
          <p className="mb-4 text-sm text-[var(--texto-secundario)]">
            Impressora selecionada: <span className="font-medium text-[var(--texto)]">{impressoraNome}</span>
            <span className="text-[var(--texto-muted)]"> — altere ao adicionar/editar uma peça</span>
          </p>
        ) : (
          <p className="mb-4 text-sm text-[var(--texto-muted)]">
            Selecione a impressora ao adicionar uma peça para carregar os parâmetros de cálculo.
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Máquina / Energia</p>
            <div className="grid grid-cols-2 gap-2">
              <Input rotulo="Consumo (kWh)" type="number" step="0.01" value={config.consumoKwh} onChange={(e) => atualizarConfig('consumoKwh', +e.target.value)} />
              <Input rotulo="Preço kWh (R$)" type="number" step="0.01" value={config.precoKwh} onChange={(e) => atualizarConfig('precoKwh', +e.target.value)} />
              <Input rotulo="Valor máquina (R$)" type="number" value={config.valorMaquina} onChange={(e) => atualizarConfig('valorMaquina', +e.target.value)} />
              <Input rotulo="Vida útil (h)" type="number" value={config.vidaUtilHoras} onChange={(e) => atualizarConfig('vidaUtilHoras', +e.target.value)} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Margens e taxas</p>
            <div className="grid grid-cols-2 gap-2">
              <Input rotulo="Margem (mult.)" type="number" step="0.1" value={config.margemMultiplicador} onChange={(e) => atualizarConfig('margemMultiplicador', +e.target.value)} />
              <Input rotulo="Taxa falha" type="number" step="0.01" value={config.taxaFalha} onChange={(e) => atualizarConfig('taxaFalha', +e.target.value)} />
              <Input rotulo="Taxa marketplace" type="number" step="0.01" value={config.taxaMarketplace} onChange={(e) => atualizarConfig('taxaMarketplace', +e.target.value)} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--texto-muted)]">Logística (custos fixos)</p>
            <div className="grid grid-cols-2 gap-2">
              <Input rotulo="Embalagem (R$)" type="number" step="0.01" value={config.custoEmbalagem} onChange={(e) => atualizarConfig('custoEmbalagem', +e.target.value)} />
              <Input rotulo="Frete (R$)" type="number" step="0.01" value={config.custoFrete} onChange={(e) => atualizarConfig('custoFrete', +e.target.value)} />
              <Input rotulo="Acabamento (R$)" type="number" step="0.01" value={config.custoAcabamento} onChange={(e) => atualizarConfig('custoAcabamento', +e.target.value)} />
              <Input rotulo="Outros fixos (R$)" type="number" step="0.01" value={config.outrosFixos} onChange={(e) => atualizarConfig('outrosFixos', +e.target.value)} />
            </div>
          </div>
        </div>
        {impressoraId && (
          <Botao variante="fantasma" className="mt-4" onClick={salvarPadrao}>
            Salvar como padrão desta impressora
          </Botao>
        )}
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <TituloCard>Peças da sessão</TituloCard>
          <Botao onClick={() => setModalPeca({ aberto: true, item: null })}>Adicionar peça</Botao>
        </div>

        <TabelaDados
          colunas={[
            { id: 'nomePeca', rotulo: 'Peça' },
            { id: 'quantidade', rotulo: 'Qtd' },
            { id: 'tempo', rotulo: 'Tempo' },
            { id: 'pesoTotalG', rotulo: 'Peso (g)', render: (i) => String(i.pesoTotalG) },
            {
              id: 'precoUnitario',
              rotulo: 'Preço unit.',
              render: (i) => formatarMoeda(i.precoUnitario),
            },
            {
              id: 'precoTotal',
              rotulo: 'Preço total',
              render: (i) => formatarMoeda(i.precoTotal),
            },
            {
              id: 'acoes',
              rotulo: '',
              render: (i) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removerPeca(i.id) }}
                  className="text-erro hover:opacity-80"
                  aria-label="Excluir peça"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          dados={linhasPecas}
          chave={(i) => i.id}
          onLinhaClick={(i) => setModalPeca({ aberto: true, item: i.item })}
          vazio="Nenhuma peça adicionada. Clique em Adicionar peça."
        />

        {pecasSessao.length > 0 && (
          <p className="mt-3 text-right text-lg font-bold text-secondary-600">
            Total da sessão: {formatarMoeda(totaisSessao.precoTotal)}
          </p>
        )}
      </div>

      {pecasSessao.length > 0 && (
        <Card className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--texto-secundario)]">Cliente para o orçamento</span>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="min-w-[200px] rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
            >
              <option value="">Selecionar cliente...</option>
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <Botao onClick={gerarOrcamento} disabled={gerando}>
            {gerando ? 'Gerando...' : `Gerar orçamento (${pecasSessao.length} peça${pecasSessao.length > 1 ? 's' : ''})`}
          </Botao>
          {msg && <p className="text-sm text-erro">{msg}</p>}
        </Card>
      )}

      <ModalPecaCalculadora
        aberto={modalPeca.aberto}
        materiais={materiais.data ?? []}
        item={modalPeca.item}
        onFechar={() => setModalPeca({ aberto: false, item: null })}
        onSalvar={salvarPeca}
      />
    </div>
  )
}
