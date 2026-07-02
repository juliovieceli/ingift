import type { PortfolioGrupo, PortfolioItemComGrupos } from '@/tipos/database'

export function urlsImagemGrupo(
  grupo: Pick<PortfolioGrupo, 'id' | 'urlsImagem'>,
  itens: Pick<PortfolioItemComGrupos, 'grupoIds' | 'urlsImagem' | 'ordem'>[],
): string[] {
  if (grupo.urlsImagem.length > 0) return grupo.urlsImagem

  const primeiro = itens
    .filter((i) => i.grupoIds.includes(grupo.id))
    .sort((a, b) => a.ordem - b.ordem)[0]

  return primeiro?.urlsImagem ?? []
}

export function nomesGrupo(
  grupoIds: string[],
  grupos: Pick<PortfolioGrupo, 'id' | 'nome'>[],
): string[] {
  return grupoIds
    .map((id) => grupos.find((g) => g.id === id)?.nome)
    .filter((nome): nome is string => Boolean(nome))
}

/** @deprecated Use nomesGrupo com array */
export function nomeGrupo(
  grupoId: string | null | undefined,
  grupos: Pick<PortfolioGrupo, 'id' | 'nome'>[],
): string | null {
  if (!grupoId) return null
  return grupos.find((g) => g.id === grupoId)?.nome ?? null
}
