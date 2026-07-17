import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinanceiroBaixa, FinanceiroPlanoConta, FinanceiroTitulo } from '@/tipos/database'

// ── Helpers de formatação ──────────────────────────────────────────────────

export function saldoPendente(titulo: Pick<FinanceiroTitulo, 'valor' | 'valorBaixado'>): number {
  return Number(titulo.valor) - Number(titulo.valorBaixado)
}

export function rotuloStatusTitulo(status: FinanceiroTitulo['status']): string {
  return { pendente: 'Pendente', parcial: 'Parcial', quitado: 'Quitado' }[status] ?? status
}

export function corStatusTitulo(status: FinanceiroTitulo['status']): string {
  return {
    pendente: 'var(--alerta)',
    parcial: 'var(--primaria)',
    quitado: 'var(--sucesso)',
  }[status] ?? 'var(--texto-muted)'
}

// ── Códigos default do seed ────────────────────────────────────────────────
export const CODIGO_DEFAULT_RECEITA = 'receita_vendas'
export const CODIGO_DEFAULT_DESPESA = 'despesa_materia_prima'
export const CODIGO_FRETE_CLIENTE = 'despesa_frete_cliente'
export const CODIGO_FRETE_EMPRESA = 'despesa_frete_empresa'

export type FreteResponsavel = 'cliente' | 'empresa'

export async function buscarPlanoContaIdPorCodigo(
  supabase: SupabaseClient,
  codigo: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('FinanceiroPlanoConta')
    .select('id')
    .eq('codigo', codigo)
    .single()
  return data?.id ?? null
}

// ── RPCs ───────────────────────────────────────────────────────────────────

export async function faturarOrcamento(
  supabase: SupabaseClient,
  params: {
    orcamentoId: string
    planoContaId: string
    vencimento: string
    descricao?: string
    freteResponsavel?: FreteResponsavel | null
  },
): Promise<string> {
  const { data, error } = await supabase.rpc('faturarOrcamento', {
    p_orcamentoid: params.orcamentoId,
    p_planocontaid: params.planoContaId,
    p_vencimento: params.vencimento,
    p_descricao: params.descricao ?? null,
    p_freteresponsavel: params.freteResponsavel ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function registrarBaixaTitulo(
  supabase: SupabaseClient,
  params: { tituloId: string; contaId: string; valor: number; dataBaixa: string; obs?: string },
): Promise<string> {
  const { data, error } = await supabase.rpc('registrarBaixaTitulo', {
    p_tituloid:   params.tituloId,
    p_contaid:    params.contaId,
    p_valor:      params.valor,
    p_databaixa:  params.dataBaixa,
    p_obs:        params.obs ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function estornarBaixaTitulo(
  supabase: SupabaseClient,
  baixaId: string,
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc('estornarBaixaTitulo', {
    p_baixaid: baixaId,
    p_motivo:  motivo ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function excluirTituloFinanceiro(
  supabase: SupabaseClient,
  tituloId: string,
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc('excluirTituloFinanceiro', {
    p_tituloid: tituloId,
    p_motivo:   motivo ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function criarDespesaCompra(
  supabase: SupabaseClient,
  params: { movimentacaoId: string; planoContaId: string; vencimento: string; descricao?: string },
): Promise<string> {
  const { data, error } = await supabase.rpc('criarDespesaCompra', {
    p_movimentacaoid: params.movimentacaoId,
    p_planocontaid:   params.planoContaId,
    p_vencimento:     params.vencimento,
    p_descricao:      params.descricao ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

// ── Fluxo de caixa ─────────────────────────────────────────────────────────

export type LinhaFluxo = {
  mes: string
  receitas: number
  despesas: number
  saldoPeriodo: number
}

export async function buscarFluxoCaixaMensal(
  supabase: SupabaseClient,
  dataInicio?: string,
  dataFim?: string,
): Promise<LinhaFluxo[]> {
  const params: Record<string, string> = {}
  if (dataInicio) params.p_datainicio = dataInicio
  if (dataFim) params.p_datafim = dataFim

  const { data, error } = await supabase.rpc('fluxoCaixaMensal', params)
  if (error) throw new Error(error.message)
  return (data ?? []) as LinhaFluxo[]
}

// ── Consultas de suporte ────────────────────────────────────────────────────

export type TituloComPlano = FinanceiroTitulo & {
  FinanceiroPlanoConta?: Pick<FinanceiroPlanoConta, 'nome' | 'codigo'>
}

export async function buscarTitulosDoOrcamento(
  supabase: SupabaseClient,
  orcamentoId: string,
): Promise<TituloComPlano[]> {
  const { data } = await supabase
    .from('FinanceiroTitulo')
    .select('*, FinanceiroPlanoConta(nome, codigo)')
    .eq('orcamentoId', orcamentoId)
    .order('criadoEm', { ascending: true })
  return (data ?? []) as TituloComPlano[]
}

/** Receita vinculada ao orçamento (contas a receber). */
export async function buscarTituloDoOrcamento(
  supabase: SupabaseClient,
  orcamentoId: string,
): Promise<TituloComPlano | null> {
  const { data } = await supabase
    .from('FinanceiroTitulo')
    .select('*, FinanceiroPlanoConta(nome, codigo)')
    .eq('orcamentoId', orcamentoId)
    .eq('tipo', 'receita')
    .maybeSingle()
  return data ?? null
}

export async function buscarBaixasDeTitulo(
  supabase: SupabaseClient,
  tituloId: string,
): Promise<(FinanceiroBaixa & { FinanceiroContaCaixa?: { nome: string } })[]> {
  const { data } = await supabase
    .from('FinanceiroBaixa')
    .select('*, FinanceiroContaCaixa(nome)')
    .eq('tituloId', tituloId)
    .order('dataBaixa', { ascending: false })
  return (data ?? []) as (FinanceiroBaixa & { FinanceiroContaCaixa?: { nome: string } })[]
}
