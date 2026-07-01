// Mapeamento de materiais da calculadora antiga (docs/orders-item-filaments.json)
// para os materiais do banco atual (tabela "Material").
//
// - NEW_MATERIALS: materiais que NÃO existiam em docs/materiaisexistentes.json e
//   precisaram ser criados para cobrir os lançamentos legados. IDs gerados uma
//   única vez aqui (fixos) para que o script seja reprodutível.
// - MATERIAL_MAP: cada combinação (tipo, cor) encontrada nos lançamentos antigos
//   e o nome do material atual (existente ou novo) para o qual ela deve apontar.
//   `aproximado: true` sinaliza mapeamentos que não são uma correspondência exata
//   (ex.: "PLA verde" não existe como material próprio, foi associado ao tricolor
//   que contém verde na composição).

export const NEW_MATERIALS = [
  {
    id: 'f58e63a3-91f1-41c8-a3fe-09da52784351',
    nome: 'PLA (legado)',
    descricao: 'Filamento PLA sem cor registrada nos lançamentos antigos da calculadora',
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PLA',
    cor: null,
    marca: null,
  },
  {
    id: '4cc56271-544d-444f-b9e0-f2e2b688032d',
    nome: 'PLA BRANCO',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PLA',
    cor: 'branco',
    marca: null,
  },
  {
    id: 'c2aef494-82f0-4b3b-b69e-580f84a5112a',
    nome: 'PLA LARANJA',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PLA',
    cor: 'laranja',
    marca: null,
  },
  {
    id: '4d9de601-c188-4f2f-abc5-b39f6eaa5bda',
    nome: 'PLA BEGE',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PLA',
    cor: 'bege',
    marca: null,
  },
  {
    id: '3649e64a-c309-4f1e-bc92-70e3e06b471f',
    nome: 'PLA BRONZE',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PLA',
    cor: 'bronze',
    marca: null,
  },
  {
    id: 'bae17759-90e6-4337-a00c-09d3d45398e0',
    nome: 'PETG CINZA',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PETG',
    cor: 'cinza',
    marca: null,
  },
  {
    id: '71cab7d8-f107-4a92-bdd9-5e9895efcf76',
    nome: 'PETG (legado)',
    descricao: 'Filamento PETG sem cor registrada nos lançamentos antigos da calculadora',
    categoria: 'filamento',
    unidadeMedida: 'gr',
    tipoMaterial: 'PETG',
    cor: null,
    marca: null,
  },
]

export const MATERIAL_MAP = [
  { tipo: 'PLA', cor: 'azul', materialNome: 'PLA AZUL - SUNLU' },
  { tipo: 'PLA', cor: 'marrom', materialNome: 'PLA MARROM - SUNLU' },
  { tipo: 'PLA', cor: 'amarelo', materialNome: 'PLA AMARELO - SUNLU' },
  { tipo: 'PLA', cor: 'preto', materialNome: 'PLA PRETO' },
  { tipo: 'PLA', cor: 'tricolor', materialNome: 'PLA TRICOLOR - VERDE, DOURADO E PINK' },
  {
    tipo: 'PLA',
    cor: 'verde',
    materialNome: 'PLA TRICOLOR - VERDE, DOURADO E PINK',
    aproximado: true,
    nota: 'Não existe "PLA verde" isolado na base atual; associado ao tricolor (verde/dourado/pink) por conter verde na composição.',
  },
  { tipo: 'PLA', cor: null, materialNome: 'PLA (legado)' },
  { tipo: 'PLA', cor: 'branco', materialNome: 'PLA BRANCO' },
  { tipo: 'PLA', cor: 'laranja', materialNome: 'PLA LARANJA' },
  { tipo: 'PLA', cor: 'bege', materialNome: 'PLA BEGE' },
  { tipo: 'PLA', cor: 'bronze', materialNome: 'PLA BRONZE' },
  { tipo: 'PETG', cor: 'cinza', materialNome: 'PETG CINZA' },
  { tipo: 'PETG', cor: null, materialNome: 'PETG (legado)' },
]

export function normalizarCor(cor) {
  const c = (cor ?? '').trim().toLowerCase()
  return c === '' ? null : c
}

export function chaveMaterial(tipo, cor) {
  return `${(tipo ?? '').trim().toUpperCase()}|${normalizarCor(cor) ?? ''}`
}

export function construirResolverDeMaterial(materiaisExistentes) {
  const porNome = new Map(materiaisExistentes.map((m) => [m.nome.trim().toLowerCase(), m]))
  for (const novo of NEW_MATERIALS) {
    porNome.set(novo.nome.trim().toLowerCase(), novo)
  }

  const porChave = new Map()
  for (const regra of MATERIAL_MAP) {
    const material = porNome.get(regra.materialNome.trim().toLowerCase())
    if (!material) {
      throw new Error(
        `Material "${regra.materialNome}" referenciado no mapa não foi encontrado (nem existente, nem novo).`,
      )
    }
    porChave.set(chaveMaterial(regra.tipo, regra.cor), { material, regra })
  }

  return function resolver(tipo, cor) {
    const chave = chaveMaterial(tipo, cor)
    const encontrado = porChave.get(chave)
    if (!encontrado) return null
    return encontrado
  }
}
