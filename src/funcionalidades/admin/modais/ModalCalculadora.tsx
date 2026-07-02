import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { FormularioItemAvulso } from '@/funcionalidades/admin/FormularioItemAvulso'
import { FormularioPecaOrcamento, pecaVazia, validarPecaOrcamento, type ErrosPecaOrcamento } from '@/funcionalidades/admin/FormularioPecaOrcamento'
import { ModalDivergenciaPrecos } from '@/funcionalidades/admin/modais/ModalDivergenciaPrecos'
import { ModalSalvarModelo } from '@/funcionalidades/admin/modais/ModalSalvarModelo'
import { PainelConfigCalculadora } from '@/funcionalidades/admin/PainelConfigCalculadora'
import { PainelParamsMargem } from '@/funcionalidades/admin/PainelParamsMargem'
import {
  avulsoVazio,
  calcularItemAvulso,
  calcularItemPeca,
  paramsMargemDeConfig,
  type AvulsoCalculo,
  type ParamsMargemItem,
  type PecaCalculo,
} from '@/lib/calculadora'
import {
  materiaisNecessariosAvulso,
  materiaisNecessariosPeca,
  mensagemFaltaEstoque,
  verificarDisponibilidadeMateriais,
} from '@/lib/estoque'
import {
  aplicarModeloComEscolha,
  compararModeloComPrecosAtuais,
  listarModelosPeca,
  salvarModeloDePeca,
  type DivergenciaPreco,
  type EscolhaPrecosModelo,
  type ItemOrcamentoModeloComComposicao,
} from '@/lib/itemOrcamentoModelo'
import {
  atualizarItemAvulso,
  atualizarOrcamentoItem,
  configDeItem,
  impressoraCombinaConfig,
  itemParaAvulso,
  itemParaPeca,
  salvarItemAvulso,
  salvarOrcamentoItem,
  type OrcamentoItemComComposicao,
} from '@/lib/orcamento'
import { supabase } from '@/lib/supabase'
import { impressoraCalculoStore, useImpressoraCalculo } from '@/stores/impressoraCalculoStore'
import type { ImpressoraConfiguracao, Material } from '@/tipos/database'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  orcamentoId: string
  tipoItem: 'peca' | 'avulso'
  itemEdicao?: OrcamentoItemComComposicao | null
  ordemInicial?: number
}

function clonarPeca(p: PecaCalculo): PecaCalculo {
  return {
    ...p,
    filamentos: p.filamentos.map((f) => ({ ...f })),
    insumos: (p.insumos ?? []).map((i) => ({ ...i })),
  }
}

export function ModalCalculadora({
  aberto,
  onFechar,
  onSalvo,
  orcamentoId,
  tipoItem,
  itemEdicao,
  ordemInicial = 0,
}: Props) {
  const qc = useQueryClient()
  const { impressoraId, config } = useImpressoraCalculo()
  const [peca, setPeca] = useState<PecaCalculo>(pecaVazia())
  const [avulso, setAvulso] = useState<AvulsoCalculo>(avulsoVazio())
  const [params, setParams] = useState<ParamsMargemItem>(paramsMargemDeConfig(config))
  const [erro, setErro] = useState('')
  const [errosCampo, setErrosCampo] = useState<ErrosPecaOrcamento>({})
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('')
  const [modeloPendente, setModeloPendente] = useState<ItemOrcamentoModeloComComposicao | null>(null)
  const [divergencias, setDivergencias] = useState<DivergenciaPreco[]>([])
  const [modalDivergencia, setModalDivergencia] = useState(false)
  const [modalSalvarModelo, setModalSalvarModelo] = useState(false)
  const [erroSalvarModelo, setErroSalvarModelo] = useState('')

  const impressoras = useQuery({
    queryKey: ['impressoras'],
    enabled: aberto,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('ImpressoraConfiguracao').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as ImpressoraConfiguracao[]
    },
  })

  const modelos = useQuery({
    queryKey: ['modelos-peca'],
    enabled: aberto && tipoItem === 'peca',
    queryFn: async () => {
      if (!supabase) return []
      return listarModelosPeca(supabase)
    },
  })

  const orcamento = useQuery({
    queryKey: ['orcamento-impressora', orcamentoId],
    enabled: aberto && Boolean(orcamentoId),
    queryFn: async () => {
      if (!supabase) return null
      const { data } = await supabase
        .from('Orcamento')
        .select('configuracaoImpressoraId')
        .eq('id', orcamentoId)
        .single()
      return data
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

  const impressoraAtual = useMemo(() => {
    const lista = impressoras.data ?? []
    if (impressoraId) return lista.find((i) => i.id === impressoraId) ?? lista[0]
    return lista[0]
  }, [impressoras.data, impressoraId])

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setErrosCampo({})
    setModeloSelecionadoId('')
    setModeloPendente(null)
    setDivergencias([])
    setModalDivergencia(false)
    setModalSalvarModelo(false)
    setErroSalvarModelo('')

    if (itemEdicao) {
      impressoraCalculoStore.setConfig(configDeItem(itemEdicao))

      if (tipoItem === 'peca') {
        const { peca: p, params: pm } = itemParaPeca(itemEdicao)
        setPeca(clonarPeca(p))
        setParams(pm)
      } else {
        setAvulso({ ...itemParaAvulso(itemEdicao) })
        setParams({
          taxaFalha: Number(itemEdicao.taxaFalha),
          margemMultiplicador: Number(itemEdicao.margemMultiplicador),
          taxaMarketplace: Number(itemEdicao.taxaMarketplace),
          adicional: Number(itemEdicao.adicional),
          desconto: Number(itemEdicao.desconto),
        })
      }
    } else {
      setPeca(pecaVazia())
      setAvulso(avulsoVazio())
      setParams(paramsMargemDeConfig(impressoraCalculoStore.getState().config))
    }
  }, [aberto, itemEdicao, tipoItem])

  useEffect(() => {
    if (!aberto || !impressoras.data) return

    if (itemEdicao) {
      const configItem = configDeItem(itemEdicao)
      const impressoraUsada = impressoras.data.find((i) => impressoraCombinaConfig(i, configItem))
      impressoraCalculoStore.setImpressoraId(impressoraUsada?.id ?? '')
      return
    }

    const impId = orcamento.data?.configuracaoImpressoraId
    const imp = impId ? impressoras.data.find((i) => i.id === impId) : impressoras.data[0]
    if (imp) impressoraCalculoStore.aplicarImpressora(imp)
  }, [aberto, impressoras.data, orcamento.data, itemEdicao])

  const aplicarModeloNoFormulario = (
    modelo: ItemOrcamentoModeloComComposicao,
    escolha: EscolhaPrecosModelo,
  ) => {
    const mats = materiais.data ?? []
    const { peca: p, config: c, params: pm } = aplicarModeloComEscolha(
      modelo,
      escolha,
      mats,
      impressoraAtual,
    )
    setPeca(clonarPeca(p))
    impressoraCalculoStore.setConfig(c)
    setParams(pm)

    if (escolha === 'modelo') {
      if (modelo.configuracaoImpressoraId) {
        impressoraCalculoStore.setImpressoraId(modelo.configuracaoImpressoraId)
      } else {
        const imp = impressoras.data?.find((i) => impressoraCombinaConfig(i, c))
        impressoraCalculoStore.setImpressoraId(imp?.id ?? '')
      }
    }

    setModeloSelecionadoId(modelo.id)
    setErrosCampo({})
    setErro('')
  }

  const selecionarModelo = (id: string) => {
    setModeloSelecionadoId(id)
    if (!id) return

    const modelo = modelos.data?.find((m) => m.id === id)
    if (!modelo) return

    const divs = compararModeloComPrecosAtuais(modelo, materiais.data ?? [], impressoraAtual)
    if (divs.length > 0) {
      setModeloPendente(modelo)
      setDivergencias(divs)
      setModalDivergencia(true)
      return
    }

    aplicarModeloNoFormulario(modelo, 'atuais')
  }

  const confirmarDivergencia = (escolha: EscolhaPrecosModelo) => {
    if (!modeloPendente) return
    aplicarModeloNoFormulario(modeloPendente, escolha)
    setModeloPendente(null)
    setDivergencias([])
    setModalDivergencia(false)
  }

  const cancelarDivergencia = () => {
    setModeloPendente(null)
    setDivergencias([])
    setModalDivergencia(false)
    setModeloSelecionadoId('')
  }

  const previewPeca = useMemo(() => {
    if (tipoItem !== 'peca' || !peca.nomePeca) return null
    try {
      return calcularItemPeca(
        {
          consumoKwh: config.consumoKwh,
          precoKwh: config.precoKwh,
          valorMaquina: config.valorMaquina,
          vidaUtilHoras: config.vidaUtilHoras,
        },
        peca,
        params,
      )
    } catch {
      return null
    }
  }, [tipoItem, peca, params, config])

  const previewAvulso = useMemo(() => {
    if (tipoItem !== 'avulso' || !avulso.nome) return null
    return calcularItemAvulso(avulso, params)
  }, [tipoItem, avulso, params])

  const pecaValidaParaModelo = useMemo(() => {
    if (tipoItem !== 'peca') return false
    return Object.keys(validarPecaOrcamento(peca)).length === 0
  }, [tipoItem, peca])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')

      if (tipoItem === 'peca') {
        const input = { peca, config, params }
        if (itemEdicao) {
          await atualizarOrcamentoItem(supabase, orcamentoId, itemEdicao.id, input)
        } else {
          await salvarOrcamentoItem(supabase, orcamentoId, input, ordemInicial)
        }
      } else {
        const input = { avulso, config, params }
        if (itemEdicao) {
          await atualizarItemAvulso(supabase, orcamentoId, itemEdicao.id, input)
        } else {
          await salvarItemAvulso(supabase, orcamentoId, input, ordemInicial)
        }
      }

      if (impressoraId) {
        await supabase
          .from('Orcamento')
          .update({ configuracaoImpressoraId: impressoraId })
          .eq('id', orcamentoId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamento', orcamentoId] })
      qc.invalidateQueries({ queryKey: ['orcamento-itens', orcamentoId] })
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      onSalvo()
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const salvarModelo = useMutation({
    mutationFn: async (nome: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      await salvarModeloDePeca(supabase, {
        nome,
        peca,
        config,
        params,
        configuracaoImpressoraId: impressoraId || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelos-peca'] })
      setModalSalvarModelo(false)
      setErroSalvarModelo('')
    },
    onError: (e) => setErroSalvarModelo(e instanceof Error ? e.message : 'Erro ao salvar modelo'),
  })

  const limparErro = (chave: string) => {
    setErrosCampo((prev) => {
      if (!(chave in prev)) return prev
      const next = { ...prev }
      delete next[chave]
      return next
    })
    setErro('')
  }

  const tentarSalvar = () => {
    if (tipoItem === 'peca') {
      const erros = validarPecaOrcamento(peca)
      if (Object.keys(erros).length > 0) {
        setErrosCampo(erros)
        setErro('Corrija os campos destacados.')
        return
      }
    } else if (!avulso.nome.trim()) {
      setErro('Informe o nome do item')
      return
    }

    const mats = materiais.data ?? []
    const necessarios = tipoItem === 'peca'
      ? materiaisNecessariosPeca(peca, mats)
      : materiaisNecessariosAvulso(avulso, mats)
    const faltas = verificarDisponibilidadeMateriais(necessarios, mats)
    if (faltas.length > 0) {
      const continuar = window.confirm(
        `${mensagemFaltaEstoque(faltas)}\n\nO estoque disponível considera reservas de outros orçamentos.\nDeseja adicionar o item mesmo assim?`,
      )
      if (!continuar) return
    }

    setErrosCampo({})
    setErro('')
    salvar.mutate()
  }

  const abrirSalvarModelo = () => {
    const erros = validarPecaOrcamento(peca)
    if (Object.keys(erros).length > 0) {
      setErrosCampo(erros)
      setErro('Preencha a peça antes de salvar como modelo.')
      return
    }
    setErroSalvarModelo('')
    setModalSalvarModelo(true)
  }

  const titulo = itemEdicao
    ? tipoItem === 'peca' ? 'Editar peça' : 'Editar material / serviço'
    : tipoItem === 'peca' ? 'Adicionar peça' : 'Adicionar material / serviço'

  const preview = tipoItem === 'peca' ? previewPeca : previewAvulso

  return (
    <>
      <Modal aberto={aberto} onFechar={onFechar} titulo={titulo} largura="2xl">
        <div className="space-y-6">
          <PainelConfigCalculadora
            onConfigAlterada={() => {
              if (!itemEdicao) setParams(paramsMargemDeConfig(config))
            }}
          />

          {tipoItem === 'peca' && !itemEdicao && (modelos.data?.length ?? 0) > 0 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--texto-secundario)]">Usar modelo salvo</span>
              <select
                value={modeloSelecionadoId}
                onChange={(e) => selecionarModelo(e.target.value)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
              >
                <option value="">Selecione um modelo...</option>
                {(modelos.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </label>
          )}

          {tipoItem === 'peca' ? (
            <FormularioPecaOrcamento
              config={config}
              peca={peca}
              onChange={setPeca}
              resultado={previewPeca}
              materiais={materiais.data ?? []}
              mostrarCalcular={false}
              erros={errosCampo}
              onLimparErro={limparErro}
            />
          ) : (
            <FormularioItemAvulso avulso={avulso} onChange={setAvulso} materiais={materiais.data ?? []} />
          )}

          {(tipoItem === 'peca' || avulso.aplicarMargem) && (
            <PainelParamsMargem
              params={params}
              onChange={setParams}
              precoFinal={preview?.precoFinal}
              lucroEfetivo={preview?.lucroEfetivo}
              margemEfetiva={preview?.margemEfetiva}
            />
          )}

          {erro && <p className="text-sm text-erro">{erro}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            {tipoItem === 'peca' && pecaValidaParaModelo && (
              <Botao
                type="button"
                variante="fantasma"
                onClick={abrirSalvarModelo}
                className="mr-auto sm:mr-0"
              >
                Salvar como modelo
              </Botao>
            )}
            <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
            <Botao type="button" onClick={tentarSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando...' : itemEdicao ? 'Salvar alterações' : 'Adicionar ao orçamento'}
            </Botao>
          </div>
        </div>
      </Modal>

      <ModalDivergenciaPrecos
        aberto={modalDivergencia}
        divergencias={divergencias}
        onCancelar={cancelarDivergencia}
        onAplicar={confirmarDivergencia}
      />

      <ModalSalvarModelo
        aberto={modalSalvarModelo}
        nomeSugerido={peca.nomePeca}
        onFechar={() => setModalSalvarModelo(false)}
        onSalvar={(nome) => salvarModelo.mutate(nome)}
        salvando={salvarModelo.isPending}
        erro={erroSalvarModelo}
      />
    </>
  )
}
