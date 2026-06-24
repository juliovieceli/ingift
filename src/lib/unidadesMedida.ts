export const UNIDADES_MEDIDA = ['gr', 'un', 'cx'] as const
export const UNIDADE_FILAMENTO = 'gr' as const

export type UnidadeMedida = (typeof UNIDADES_MEDIDA)[number]
