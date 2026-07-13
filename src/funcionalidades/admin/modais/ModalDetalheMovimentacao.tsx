import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { ehMovimentacaoManual, excluirMovimentacaoEstoque } from '@/lib/estoque'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import type { EstoqueMovimentacao } from '@/tipos/database'

export type MovimentacaoDetalhe = EstoqueMovimentacao & {
  Material?: { nome: string; unidadeMedida: string } | null
  EstoqueTipoMovimentacao?: { nome: string; codigo: string } | null
}

interface Props {
  aberto: boolean
  movimentacao: MovimentacaoDetalhe | null
  /** Quando true, Voltar usa navigate(-1) (ex.: veio do financeiro via ?id=) */
  voltarComHistorico?: boolean
  onFechar: () => void
  onExcluido: () => void
}

export function ModalDetalheMovimentacao({
  aberto,
  movimentacao,
  voltarComHistorico = false,
  onFechar,
  onExcluido,
}: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')

  const tituloFinanceiro = useQuery({
    queryKey: ['titulo-por-movimentacao', movimentacao?.id],
    enabled: aberto && Boolean(movimentacao?.id) && Boolean(supabase),
    queryFn: async () => {
      if (!supabase || !movimentacao) return null
      const { data, error } = await supabase
        .from('FinanceiroTitulo')
        .select('id, descricao, valor, status')
        .eq('movimentacaoEstoqueId', movimentacao.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const excluirMov = useMutation({
    mutationFn: async ({ motivo }: { motivo: string }) => {
      if (!supabase || !movimentacao) throw new Error('Supabase não configurado')
      await excluirMovimentacaoEstoque(supabase, movimentacao.id, motivo || undefined)
    },
    onSuccess: () => {
      setConfirmandoExclusao(false)
      setMotivoExclusao('')
      setErroExclusao('')
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['financeiro-titulos'] })
      qc.invalidateQueries({ queryKey: ['contas-caixa'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
      qc.invalidateQueries({ queryKey: ['baixas-titulo'] })
      onExcluido()
    },
    onError: (e) => setErroExclusao(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  function fecharOuVoltar() {
    if (voltarComHistorico) {
      navigate(-1)
      return
    }
    setConfirmandoExclusao(false)
    setMotivoExclusao('')
    setErroExclusao('')
    onFechar()
  }

  if (!movimentacao) return null

  const podeExcluir =
    ehMovimentacaoManual(movimentacao.EstoqueTipoMovimentacao?.codigo) && !movimentacao.orcamentoId

  const linhas: { rotulo: string; valor: string }[] = [
    { rotulo: 'Número', valor: `#${movimentacao.numeroSequencial}` },
    {
      rotulo: 'Tipo',
      valor: movimentacao.EstoqueTipoMovimentacao?.nome ?? '—',
    },
    { rotulo: 'Material', valor: movimentacao.Material?.nome ?? '—' },
    {
      rotulo: 'Quantidade',
      valor: `${movimentacao.quantidade ?? 0} ${movimentacao.Material?.unidadeMedida ?? ''}`.trim(),
    },
    {
      rotulo: 'Valor',
      valor: movimentacao.valorTotal != null ? formatarMoeda(Number(movimentacao.valorTotal)) : '—',
    },
    { rotulo: 'Fornecedor', valor: movimentacao.fornecedor ?? '—' },
    {
      rotulo: 'Data',
      valor: movimentacao.dataMovimentacao
        ? new Date(movimentacao.dataMovimentacao + 'T12:00:00').toLocaleDateString('pt-BR')
        : new Date(movimentacao.criadoEm).toLocaleDateString('pt-BR'),
    },
    {
      rotulo: 'Registrado em',
      valor: new Date(movimentacao.criadoEm).toLocaleString('pt-BR'),
    },
    { rotulo: 'Observações', valor: movimentacao.observacoes?.trim() || '—' },
  ]

  return (
    <>
      <Modal
        aberto={aberto && !confirmandoExclusao}
        onFechar={fecharOuVoltar}
        titulo={`Movimentação #${movimentacao.numeroSequencial}`}
        largura="md"
      >
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm">
            {linhas.map((l) => (
              <div key={l.rotulo} className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-[var(--texto-muted)]">{l.rotulo}</dt>
                <dd className="text-[var(--texto)]">{l.valor}</dd>
              </div>
            ))}
            {tituloFinanceiro.data && (
              <div className="grid grid-cols-[9rem_1fr] gap-2 border-t border-[var(--borda)] pt-3">
                <dt className="text-[var(--texto-muted)]">Título financeiro</dt>
                <dd className="text-[var(--texto)]">
                  {tituloFinanceiro.data.descricao}
                  {' · '}
                  {formatarMoeda(Number(tituloFinanceiro.data.valor))}
                  {' · '}
                  {tituloFinanceiro.data.status}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--borda)] pt-4">
            <Botao variante="fantasma" onClick={fecharOuVoltar}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Botao>
            {podeExcluir && (
              <Botao
                className="bg-erro text-white hover:bg-erro/90"
                onClick={() => {
                  setErroExclusao('')
                  setMotivoExclusao('')
                  setConfirmandoExclusao(true)
                }}
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Botao>
            )}
          </div>
        </div>
      </Modal>

      {confirmandoExclusao && (
        <Modal
          aberto={confirmandoExclusao}
          onFechar={() => {
            setConfirmandoExclusao(false)
            setMotivoExclusao('')
            setErroExclusao('')
          }}
          titulo="Excluir movimentação"
          largura="md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--texto-secundario)]">
              Isso estornará baixas e a despesa financeira vinculada (se houver), reverterá o estoque
              de <strong>{movimentacao.Material?.nome ?? 'material'}</strong> e apagará o registro
              permanentemente. A operação ficará registrada em log.
            </p>
            <p className="text-sm text-[var(--texto-muted)]">
              Movimentação #{movimentacao.numeroSequencial}
              {' · '}
              {movimentacao.EstoqueTipoMovimentacao?.nome ?? 'Movimentação'}
              {' · '}
              {movimentacao.quantidade ?? 0} {movimentacao.Material?.unidadeMedida ?? ''}
              {movimentacao.valorTotal != null
                ? ` · ${formatarMoeda(Number(movimentacao.valorTotal))}`
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
                  setConfirmandoExclusao(false)
                  setMotivoExclusao('')
                  setErroExclusao('')
                }}
              >
                Cancelar
              </Botao>
              <Botao
                className="bg-erro text-white hover:bg-erro/90"
                onClick={() => excluirMov.mutate({ motivo: motivoExclusao })}
                disabled={excluirMov.isPending}
              >
                {excluirMov.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
