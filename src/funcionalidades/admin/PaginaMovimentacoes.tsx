import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { ehMovimentacaoManual, excluirMovimentacaoEstoque } from '@/lib/estoque'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalMovimentacaoEstoque } from '@/funcionalidades/admin/modais/ModalMovimentacaoEstoque'
import type { EstoqueMovimentacao } from '@/tipos/database'

type MovimentacaoLista = EstoqueMovimentacao & {
  Material?: { nome: string; unidadeMedida: string }
  EstoqueTipoMovimentacao?: { nome: string; codigo: string }
}

export function PaginaMovimentacoes() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [modalAberto, setModalAberto] = useState(false)
  const [confirmExclusao, setConfirmExclusao] = useState<MovimentacaoLista | null>(null)
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')
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
      return (data ?? []) as MovimentacaoLista[]
    },
  })

  const tabela = useOrdenacaoPaginacao(historico.data ?? [], 'criadoEm', 'desc')

  const excluirMov = useMutation({
    mutationFn: async ({ mov, motivo }: { mov: MovimentacaoLista; motivo: string }) => {
      if (!supabase) throw new Error('Supabase não configurado')
      await excluirMovimentacaoEstoque(supabase, mov.id, motivo || undefined)
    },
    onSuccess: () => {
      setConfirmExclusao(null)
      setMotivoExclusao('')
      setErroExclusao('')
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      qc.invalidateQueries({ queryKey: ['baixas-titulo'] })
    },
    onError: (e) => setErroExclusao(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

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
        idTabela="movimentacoes-estoque"
        colunasPadraoMobile={['criadoEm', 'material', 'tipo', 'quantidade', 'acoes']}
        colunas={[
          { id: 'criadoEm', rotulo: 'Data', ordenavel: true, render: (m) => new Date(m.criadoEm).toLocaleDateString('pt-BR') },
          { id: 'material', rotulo: 'Material', render: (m) => m.Material?.nome ?? '—' },
          { id: 'tipo', rotulo: 'Tipo', render: (m) => m.EstoqueTipoMovimentacao?.nome ?? '—' },
          { id: 'quantidade', rotulo: 'Qtd', render: (m) => `${m.quantidade ?? 0} ${m.Material?.unidadeMedida ?? ''}` },
          { id: 'valorTotal', rotulo: 'Valor', render: (m) => m.valorTotal != null ? formatarMoeda(Number(m.valorTotal)) : '—' },
          { id: 'fornecedor', rotulo: 'Fornecedor', render: (m) => m.fornecedor ?? '—' },
          { id: 'observacoes', rotulo: 'Obs', render: (m) => m.observacoes ?? '—' },
          {
            id: 'acoes',
            rotulo: 'Ações',
            obrigatoria: true,
            render: (m) => {
              if (!ehMovimentacaoManual(m.EstoqueTipoMovimentacao?.codigo) || m.orcamentoId) {
                return <span className="text-xs text-[var(--texto-muted)]">—</span>
              }
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setErroExclusao('')
                    setMotivoExclusao('')
                    setConfirmExclusao(m)
                  }}
                  className="inline-flex min-h-8 items-center gap-1 text-xs text-erro hover:underline"
                  title="Excluir movimentação"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              )
            },
          },
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

      {confirmExclusao && (
        <Modal
          aberto={Boolean(confirmExclusao)}
          onFechar={() => {
            setConfirmExclusao(null)
            setMotivoExclusao('')
            setErroExclusao('')
          }}
          titulo="Excluir movimentação"
          largura="md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--texto-secundario)]">
              Isso estornará baixas e a despesa financeira vinculada (se houver), reverterá o estoque
              de <strong>{confirmExclusao.Material?.nome ?? 'material'}</strong> e apagará o registro
              permanentemente. A operação ficará registrada em log.
            </p>
            <p className="text-sm text-[var(--texto-muted)]">
              {confirmExclusao.EstoqueTipoMovimentacao?.nome ?? 'Movimentação'}
              {' · '}
              {confirmExclusao.quantidade ?? 0} {confirmExclusao.Material?.unidadeMedida ?? ''}
              {confirmExclusao.valorTotal != null
                ? ` · ${formatarMoeda(Number(confirmExclusao.valorTotal))}`
                : ''}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--texto-secundario)]">Motivo (opcional)</span>
              <input
                type="text"
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
                placeholder="Informe o motivo..."
              />
            </label>
            {erroExclusao && <p className="text-sm text-erro">{erroExclusao}</p>}
            <div className="flex justify-end gap-2">
              <Botao
                variante="fantasma"
                onClick={() => {
                  setConfirmExclusao(null)
                  setMotivoExclusao('')
                  setErroExclusao('')
                }}
              >
                Cancelar
              </Botao>
              <Botao
                className="bg-erro text-white hover:bg-erro/90"
                onClick={() =>
                  excluirMov.mutate({ mov: confirmExclusao, motivo: motivoExclusao })
                }
                disabled={excluirMov.isPending}
              >
                {excluirMov.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
