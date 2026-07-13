import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalMovimentacaoEstoque } from '@/funcionalidades/admin/modais/ModalMovimentacaoEstoque'
import {
  ModalDetalheMovimentacao,
  type MovimentacaoDetalhe,
} from '@/funcionalidades/admin/modais/ModalDetalheMovimentacao'

export function PaginaMovimentacoes() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [detalhe, setDetalhe] = useState<MovimentacaoDetalhe | null>(null)
  const [abriuViaUrl, setAbriuViaUrl] = useState(false)
  const materialIdUrl = params.get('materialId') ?? undefined
  const idUrl = params.get('id') ?? undefined

  useEffect(() => {
    if (materialIdUrl) setModalCriarAberto(true)
  }, [materialIdUrl])

  const historico = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('EstoqueMovimentacao')
        .select('*, Material(nome, unidadeMedida), EstoqueTipoMovimentacao(nome, codigo)')
        .order('criadoEm', { ascending: false })
        .limit(100)
      return (data ?? []) as MovimentacaoDetalhe[]
    },
  })

  useEffect(() => {
    if (!idUrl) return

    if (historico.data) {
      const mov = historico.data.find((m) => m.id === idUrl)
      if (mov) {
        setDetalhe(mov)
        setAbriuViaUrl(true)
        return
      }
    }

    if (!supabase) return
    let cancelado = false
    void (async () => {
      const { data } = await supabase
        .from('EstoqueMovimentacao')
        .select('*, Material(nome, unidadeMedida), EstoqueTipoMovimentacao(nome, codigo)')
        .eq('id', idUrl)
        .maybeSingle()
      if (cancelado || !data) return
      setDetalhe(data as MovimentacaoDetalhe)
      setAbriuViaUrl(true)
    })()
    return () => {
      cancelado = true
    }
  }, [idUrl, historico.data])

  const tabela = useOrdenacaoPaginacao(historico.data ?? [], 'criadoEm', 'desc')

  const limparParamId = () => {
    if (!params.has('id')) return
    const next = new URLSearchParams(params)
    next.delete('id')
    setParams(next, { replace: true })
  }

  const fecharDetalhe = () => {
    setDetalhe(null)
    setAbriuViaUrl(false)
    limparParamId()
  }

  const fecharModalCriar = () => {
    setModalCriarAberto(false)
    if (materialIdUrl) {
      const next = new URLSearchParams(params)
      next.delete('materialId')
      setParams(next, { replace: true })
    }
  }

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['movimentacoes'] })
    qc.invalidateQueries({ queryKey: ['materiais'] })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--texto)]">Movimentações de estoque</h2>
        <Botao onClick={() => setModalCriarAberto(true)}>Nova movimentação</Botao>
      </div>

      <TabelaDados
        idTabela="movimentacoes-estoque"
        colunasPadraoMobile={['numeroSequencial', 'criadoEm', 'material', 'tipo', 'quantidade']}
        onLinhaClick={(m) => {
          setAbriuViaUrl(false)
          setDetalhe(m)
        }}
        colunas={[
          {
            id: 'numeroSequencial',
            rotulo: '#',
            ordenavel: true,
            render: (m) => `#${m.numeroSequencial}`,
          },
          {
            id: 'criadoEm',
            rotulo: 'Data',
            ordenavel: true,
            render: (m) => new Date(m.criadoEm).toLocaleDateString('pt-BR'),
          },
          { id: 'material', rotulo: 'Material', render: (m) => m.Material?.nome ?? '—' },
          { id: 'tipo', rotulo: 'Tipo', render: (m) => m.EstoqueTipoMovimentacao?.nome ?? '—' },
          {
            id: 'quantidade',
            rotulo: 'Qtd',
            render: (m) => `${m.quantidade ?? 0} ${m.Material?.unidadeMedida ?? ''}`,
          },
          {
            id: 'valorTotal',
            rotulo: 'Valor',
            render: (m) => (m.valorTotal != null ? formatarMoeda(Number(m.valorTotal)) : '—'),
          },
          { id: 'fornecedor', rotulo: 'Fornecedor', render: (m) => m.fornecedor ?? '—' },
          { id: 'observacoes', rotulo: 'Obs', render: (m) => m.observacoes ?? '—' },
        ]}
        dados={tabela.dadosPaginados}
        chave={(m) => m.id}
        ordenacao={tabela.ordenacao}
        onOrdenar={tabela.alternarOrdenacao}
        pagina={tabela.pagina}
        totalPaginas={tabela.totalPaginas}
        totalItens={tabela.totalItens}
        itensPorPagina={tabela.itensPorPagina}
        onPagina={tabela.irParaPagina}
        onItensPorPagina={tabela.setItensPorPagina}
        vazio="Nenhuma movimentação registrada."
      />

      <ModalMovimentacaoEstoque
        aberto={modalCriarAberto}
        materialIdInicial={materialIdUrl}
        onFechar={fecharModalCriar}
        onSalvo={invalidar}
      />

      <ModalDetalheMovimentacao
        aberto={Boolean(detalhe)}
        movimentacao={detalhe}
        voltarComHistorico={abriuViaUrl}
        onFechar={fecharDetalhe}
        onExcluido={() => {
          fecharDetalhe()
          invalidar()
        }}
      />
    </div>
  )
}
