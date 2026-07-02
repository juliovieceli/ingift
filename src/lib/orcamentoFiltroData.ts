import type { Orcamento } from '@/tipos/database'

export type CampoDataOrcamentoFiltro = 'lancamento' | 'previsao_entrega'

export const ROTULOS_CAMPO_DATA_ORCAMENTO: Record<CampoDataOrcamentoFiltro, string> = {
  lancamento: 'Data de lançamento',
  previsao_entrega: 'Previsão de entrega',
}

export function dataIsoLocal(valor: string | Date): string {
  const d = typeof valor === 'string' ? new Date(valor) : valor
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function valorDataOrcamento(
  o: Pick<Orcamento, 'criadoEm' | 'prazoEntrega'>,
  campo: CampoDataOrcamentoFiltro,
): string | null {
  if (campo === 'lancamento') return dataIsoLocal(o.criadoEm)
  return o.prazoEntrega
}

export function passaFiltroDataOrcamento(
  o: Pick<Orcamento, 'criadoEm' | 'prazoEntrega'>,
  campo: CampoDataOrcamentoFiltro,
  inicio: string,
  fim: string,
): boolean {
  if (!inicio && !fim) return true
  const data = valorDataOrcamento(o, campo)
  if (!data) return false
  if (inicio && data < inicio) return false
  if (fim && data > fim) return false
  return true
}
