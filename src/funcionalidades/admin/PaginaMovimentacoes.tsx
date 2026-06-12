import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalMovimentacaoEstoque } from '@/funcionalidades/admin/modais/ModalMovimentacaoEstoque'
import type { EstoqueMovimentacao } from '@/tipos/database'

export function PaginaMovimentacoes() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [modalAberto, setModalAberto] = useState(false)
  const materialIdUrl = params.get('materialId') ?? undefined

  useEffect(() => {
    if (materialIdUrl) setModalAberto(true)
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
      return (data ?? []) as (EstoqueMovimentacao & {
        Material?: { nome: string; unidadeMedida: string }
        EstoqueTipoMovimentacao?: { nome: string; codigo: string }
      })[]
    },
  })

  const tabela = useOrdenacaoPaginacao(historico.data ?? [], 'criadoEm', 'desc')

  const fecharModal = () => {
    setModalAberto(false)
    if (materialIdUrl) {
      params.delete('materialId')
      setParams(params, { replace: true })
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
        <Botao onClick={() => setModalAberto(true)}>Nova movimentação</Botao>
      </div>

      <TabelaDados
        colunas={[
          { id: 'criadoEm', rotulo: 'Data', ordenavel: true, render: (m) => new Date(m.criadoEm).toLocaleDateString('pt-BR') },
          { id: 'material', rotulo: 'Material', render: (m) => m.Material?.nome ?? '—' },
          { id: 'tipo', rotulo: 'Tipo', render: (m) => m.EstoqueTipoMovimentacao?.nome ?? '—' },
          { id: 'quantidade', rotulo: 'Qtd', render: (m) => `${m.quantidade ?? m.quantidadeG} ${m.Material?.unidadeMedida ?? ''}` },
          { id: 'valorTotal', rotulo: 'Valor', render: (m) => m.valorTotal != null ? formatarMoeda(Number(m.valorTotal)) : '—' },
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
        aberto={modalAberto}
        materialIdInicial={materialIdUrl}
        onFechar={fecharModal}
        onSalvo={invalidar}
      />
    </div>
  )
}
