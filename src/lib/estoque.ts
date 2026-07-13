import type { SupabaseClient } from '@supabase/supabase-js'
import type { AvulsoCalculo, PecaCalculo } from '@/lib/calculadora'
import type { OrcamentoStatus } from '@/tipos/database'

import type { Material } from '@/tipos/database'

export function custoMedioDoMaterial(mat?: Pick<Material, 'custoMedioUnitario'> | null): number {
  return Number(mat?.custoMedioUnitario) || 0
}

export function precoFilamentoPorKg(mat?: Pick<Material, 'custoMedioUnitario'> | null): number {
  return custoMedioDoMaterial(mat) * 1000
}

const CODIGOS_ESTOQUE_ORCAMENTO = ['reserva_orcamento', 'liberacao_reserva', 'saida_orcamento'] as const

export async function orcamentoTemMovimentacaoEstoque(
  supabase: SupabaseClient,
  orcamentoId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('orcamentoTemMovimentacaoEstoque', {
    p_orcamentoid: orcamentoId,
  })
  if (error) {
    const { data: movs } = await supabase
      .from('EstoqueMovimentacao')
      .select('tipoMovimentacaoId')
      .eq('orcamentoId', orcamentoId)
    if (!movs?.length) return false
    const { data: tipos } = await supabase
      .from('EstoqueTipoMovimentacao')
      .select('id, codigo')
    const ids = new Set(
      (tipos ?? [])
        .filter((t) => CODIGOS_ESTOQUE_ORCAMENTO.includes(t.codigo as typeof CODIGOS_ESTOQUE_ORCAMENTO[number]))
        .map((t) => t.id),
    )
    return movs.some((m) => ids.has(m.tipoMovimentacaoId))
  }
  return Boolean(data)
}

export async function reverterEstoqueOrcamento(
  supabase: SupabaseClient,
  orcamentoId: string,
): Promise<void> {
  const { error } = await supabase.rpc('reverterEstoqueOrcamento', { p_orcamentoid: orcamentoId })
  if (error) throw new Error(error.message)
}

const CODIGOS_MOVIMENTACAO_MANUAL = [
  'entrada_compra',
  'entrada_manual',
  'perda',
  'ajuste_manual',
] as const

export function ehMovimentacaoManual(codigo: string | null | undefined): boolean {
  return CODIGOS_MOVIMENTACAO_MANUAL.includes(
    codigo as (typeof CODIGOS_MOVIMENTACAO_MANUAL)[number],
  )
}

export async function excluirMovimentacaoEstoque(
  supabase: SupabaseClient,
  movimentacaoId: string,
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc('excluirMovimentacaoEstoque', {
    p_movimentacaoid: movimentacaoId,
    p_motivo: motivo ?? null,
  })
  if (error) throw new Error(error.message)
}

export function precisaConfirmarReversaoEstoque(
  statusAtual: OrcamentoStatus,
  statusNovo: OrcamentoStatus,
  temMovimentacoes: boolean,
): boolean {
  if (!temMovimentacoes) return false

  if (statusNovo.codigo === 'cancelado') return true
  if (statusNovo.liberaReserva) return true

  const retrocesso = statusNovo.ordem < statusAtual.ordem
  const atualAfetouEstoque = statusAtual.reservaEstoque || statusAtual.baixaEstoque
  if (retrocesso && atualAfetouEstoque) return true

  if (statusAtual.baixaEstoque && !statusNovo.baixaEstoque) return true

  return false
}

export function mensagemConfirmacaoReversaoEstoque(
  statusAtual: OrcamentoStatus,
  statusNovo: OrcamentoStatus,
): string {
  return (
    `Este orçamento já possui movimentações de estoque (reserva ou saída).\n\n` +
    `Ao alterar de "${statusAtual.nome}" para "${statusNovo.nome}", as movimentações ` +
    `vinculadas serão removidas e o estoque será recalculado.\n\n` +
    `Deseja continuar?`
  )
}

export type MaterialDisponivel = {
  materialId: string
  nome: string
  necessario: number
  disponivel: number
  unidadeMedida: string
}

export function disponivelMaterial(estoqueAtual: number, estoqueReservado: number): number {
  return Number(estoqueAtual) - Number(estoqueReservado)
}

export function verificarDisponibilidadeMateriais(
  necessarios: Map<string, { quantidade: number; nome: string; unidadeMedida: string }>,
  materiais: { id: string; nome: string; estoqueAtual: number; estoqueReservado: number; unidadeMedida: string }[],
): MaterialDisponivel[] {
  const faltas: MaterialDisponivel[] = []

  for (const [materialId, req] of necessarios) {
    const mat = materiais.find((m) => m.id === materialId)
    if (!mat) continue
    const disp = disponivelMaterial(mat.estoqueAtual, mat.estoqueReservado)
    if (req.quantidade > disp) {
      faltas.push({
        materialId,
        nome: req.nome,
        necessario: req.quantidade,
        disponivel: Math.max(0, disp),
        unidadeMedida: req.unidadeMedida,
      })
    }
  }

  return faltas
}

export function mensagemFaltaEstoque(faltas: MaterialDisponivel[]): string {
  const linhas = faltas.map(
    (f) => `• ${f.nome}: necessário ${f.necessario} ${f.unidadeMedida}, disponível ${f.disponivel} ${f.unidadeMedida}`,
  )
  return `Estoque insuficiente para os materiais abaixo:\n\n${linhas.join('\n')}`
}

type MaterialEstoque = {
  id: string
  nome: string
  estoqueAtual: number
  estoqueReservado: number
  unidadeMedida: string
}

export function materiaisNecessariosPeca(
  peca: PecaCalculo,
  materiais: MaterialEstoque[],
): Map<string, { quantidade: number; nome: string; unidadeMedida: string }> {
  const map = new Map<string, { quantidade: number; nome: string; unidadeMedida: string }>()
  const qtdPeca = Math.max(1, peca.quantidade || 1)

  for (const fil of peca.filamentos) {
    if (!fil.materialId) continue
    const mat = materiais.find((m) => m.id === fil.materialId)
    const atual = map.get(fil.materialId)
    const qtd = (atual?.quantidade ?? 0) + fil.pesoG * qtdPeca
    map.set(fil.materialId, {
      quantidade: qtd,
      nome: mat?.nome ?? fil.tipo,
      unidadeMedida: mat?.unidadeMedida ?? 'gr',
    })
  }

  for (const ins of peca.insumos ?? []) {
    if (!ins.materialId) continue
    const mat = materiais.find((m) => m.id === ins.materialId)
    const atual = map.get(ins.materialId)
    const qtd = (atual?.quantidade ?? 0) + ins.quantidade * qtdPeca
    map.set(ins.materialId, {
      quantidade: qtd,
      nome: mat?.nome ?? ins.nome,
      unidadeMedida: mat?.unidadeMedida ?? 'un',
    })
  }

  return map
}

export function materiaisNecessariosAvulso(
  avulso: AvulsoCalculo,
  materiais: MaterialEstoque[],
): Map<string, { quantidade: number; nome: string; unidadeMedida: string }> {
  const map = new Map<string, { quantidade: number; nome: string; unidadeMedida: string }>()
  if (!avulso.materialId) return map
  const mat = materiais.find((m) => m.id === avulso.materialId)
  map.set(avulso.materialId, {
    quantidade: Math.max(1, avulso.quantidade || 1),
    nome: mat?.nome ?? avulso.nome,
    unidadeMedida: mat?.unidadeMedida ?? 'un',
  })
  return map
}
