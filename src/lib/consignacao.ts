import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Consignacao,
  ConsignacaoItem,
  ConsignacaoRecebimento,
} from '@/tipos/database'

// ── Tipos auxiliares ────────────────────────────────────────────────────────

export type ConsignacaoComResumo = Consignacao & {
  Cliente?: { nome: string } | null
  ConsignacaoItem?: Pick<ConsignacaoItem, 'valorTotal'>[]
  ConsignacaoRecebimento?: Pick<ConsignacaoRecebimento, 'valor'>[]
}

export type ConsignacaoItemComOrcamento = ConsignacaoItem & {
  Orcamento?: { numeroSequencial: number } | null
}

export type RecebimentoComRelacoes = ConsignacaoRecebimento & {
  FinanceiroContaCaixa?: { nome: string } | null
}

export type ConsignacaoDetalhe = Consignacao & {
  Cliente?: { nome: string; telefone: string | null } | null
}

// ── Helpers de saldo ────────────────────────────────────────────────────────

export function valorConsignado(c: { ConsignacaoItem?: { valorTotal: number }[] }): number {
  return (c.ConsignacaoItem ?? []).reduce((s, i) => s + Number(i.valorTotal), 0)
}

export function totalRecebido(c: { ConsignacaoRecebimento?: { valor: number }[] }): number {
  return (c.ConsignacaoRecebimento ?? []).reduce((s, r) => s + Number(r.valor), 0)
}

export function saldoAReceber(c: {
  ConsignacaoItem?: { valorTotal: number }[]
  ConsignacaoRecebimento?: { valor: number }[]
}): number {
  return valorConsignado(c) - totalRecebido(c)
}

// ── RPCs ─────────────────────────────────────────────────────────────────────

export async function consignarOrcamento(
  supabase: SupabaseClient,
  params: { orcamentoId: string; consignacaoId?: string | null },
): Promise<string> {
  const { data, error } = await supabase.rpc('consignarOrcamento', {
    p_orcamentoid: params.orcamentoId,
    p_consignacaoid: params.consignacaoId ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function faturarConsignacao(
  supabase: SupabaseClient,
  params: {
    consignacaoId: string
    planoContaId: string
    contaCaixaId: string
    dataRecebimento: string
    valor?: number | null
    descricao?: string
  },
): Promise<string> {
  const { data, error } = await supabase.rpc('faturarConsignacao', {
    p_consignacaoid: params.consignacaoId,
    p_planocontaid: params.planoContaId,
    p_contacaixaid: params.contaCaixaId,
    p_datarecebimento: params.dataRecebimento,
    p_valor: params.valor ?? null,
    p_descricao: params.descricao ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function reverterConsignacaoOrcamento(
  supabase: SupabaseClient,
  orcamentoId: string,
): Promise<void> {
  const { error } = await supabase.rpc('reverterConsignacaoOrcamento', {
    p_orcamentoid: orcamentoId,
  })
  if (error) throw new Error(error.message)
}

export async function marcarItemVendido(
  supabase: SupabaseClient,
  itemId: string,
  vendido: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('marcarItemVendido', {
    p_itemid: itemId,
    p_vendido: vendido,
  })
  if (error) throw new Error(error.message)
}

export async function atualizarItemConsignacao(
  supabase: SupabaseClient,
  params: { itemId: string; precoUnitario: number; quantidade?: number; descricao?: string },
): Promise<void> {
  const { error } = await supabase.rpc('atualizarItemConsignacao', {
    p_itemid: params.itemId,
    p_precounitario: params.precoUnitario,
    p_quantidade: params.quantidade ?? null,
    p_descricao: params.descricao ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function encerrarConsignacao(
  supabase: SupabaseClient,
  consignacaoId: string,
): Promise<void> {
  const { error } = await supabase.rpc('encerrarConsignacao', {
    p_consignacaoid: consignacaoId,
  })
  if (error) throw new Error(error.message)
}

// ── Consultas ─────────────────────────────────────────────────────────────────

export async function buscarConsignacoes(
  supabase: SupabaseClient,
): Promise<ConsignacaoComResumo[]> {
  const { data } = await supabase
    .from('Consignacao')
    .select('*, Cliente(nome), ConsignacaoItem(valorTotal), ConsignacaoRecebimento(valor)')
    .order('criadoEm', { ascending: false })
  return (data ?? []) as ConsignacaoComResumo[]
}

export async function buscarConsignacao(
  supabase: SupabaseClient,
  consignacaoId: string,
): Promise<ConsignacaoDetalhe | null> {
  const { data } = await supabase
    .from('Consignacao')
    .select('*, Cliente(nome, telefone)')
    .eq('id', consignacaoId)
    .maybeSingle()
  return (data ?? null) as ConsignacaoDetalhe | null
}

export async function buscarItensConsignacao(
  supabase: SupabaseClient,
  consignacaoId: string,
): Promise<ConsignacaoItemComOrcamento[]> {
  const { data } = await supabase
    .from('ConsignacaoItem')
    .select('*, Orcamento(numeroSequencial)')
    .eq('consignacaoId', consignacaoId)
    .order('consignadoEm', { ascending: true })
  return (data ?? []) as ConsignacaoItemComOrcamento[]
}

export async function buscarRecebimentosConsignacao(
  supabase: SupabaseClient,
  consignacaoId: string,
): Promise<RecebimentoComRelacoes[]> {
  const { data } = await supabase
    .from('ConsignacaoRecebimento')
    .select('*, FinanceiroContaCaixa(nome)')
    .eq('consignacaoId', consignacaoId)
    .order('dataRecebimento', { ascending: false })
  return (data ?? []) as RecebimentoComRelacoes[]
}
