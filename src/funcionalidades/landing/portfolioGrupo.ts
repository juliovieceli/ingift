import type { PortfolioGrupo, PortfolioItem } from '@/tipos/database'

export function urlImagemGrupo(
  grupo: Pick<PortfolioGrupo, 'id' | 'urlImagem'>,
  itens: Pick<PortfolioItem, 'grupoId' | 'urlImagem' | 'ordem'>[],
): string | null {
  if (grupo.urlImagem) return grupo.urlImagem

  const primeiro = itens
    .filter((i) => i.grupoId === grupo.id)
    .sort((a, b) => a.ordem - b.ordem)[0]

  return primeiro?.urlImagem ?? null
}

export function nomeGrupo(
  grupoId: string | null | undefined,
  grupos: Pick<PortfolioGrupo, 'id' | 'nome'>[],
): string | null {
  if (!grupoId) return null
  return grupos.find((g) => g.id === grupoId)?.nome ?? null
}
