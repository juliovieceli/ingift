export type ItemServico = {
  titulo: string
  descricao: string
}

export const SERVICOS_PADRAO: ItemServico[] = [
  {
    titulo: 'Prototipagem',
    descricao: 'Valide conceitos rapidamente antes de ir para a produção final.',
  },
  {
    titulo: 'Peças funcionais',
    descricao: 'Componentes resistentes pensados para uso real no dia a dia.',
  },
  {
    titulo: 'Brindes personalizados',
    descricao: 'Presentes únicos com a identidade da sua marca ou ocasião.',
  },
  {
    titulo: 'Peças sob medida',
    descricao: 'Soluções 3D desenhadas para medidas e necessidades específicas.',
  },
]

export function parseItensServico(raw: unknown): ItemServico[] {
  if (!Array.isArray(raw)) return SERVICOS_PADRAO

  const itens = raw
    .map((item): ItemServico | null => {
      if (typeof item === 'string') {
        const titulo = item.trim()
        return titulo ? { titulo, descricao: '' } : null
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        const titulo = String(o.titulo ?? '').trim()
        if (!titulo) return null
        return { titulo, descricao: String(o.descricao ?? '').trim() }
      }
      return null
    })
    .filter((i): i is ItemServico => i !== null)

  return itens.length > 0 ? itens : SERVICOS_PADRAO
}

export function serializarItensServico(itens: ItemServico[]): string {
  return itens.map((i) => (i.descricao ? `${i.titulo} | ${i.descricao}` : i.titulo)).join('\n')
}

export function parseConteudoServicos(conteudo: unknown): ItemServico[] {
  const c = conteudo && typeof conteudo === 'object' ? (conteudo as Record<string, unknown>) : {}
  return parseItensServico(c.itens)
}

export function parseTextoItensServico(texto: string): ItemServico[] {
  return parseItensServico(
    texto
      .split('\n')
      .map((linha) => {
        const partes = linha.split('|')
        const titulo = partes[0]?.trim() ?? ''
        const descricao = partes.slice(1).join('|').trim()
        if (!titulo) return null
        return { titulo, descricao }
      })
      .filter(Boolean),
  )
}
