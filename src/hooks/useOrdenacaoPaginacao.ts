import { useMemo, useState } from 'react'

export type Direcao = 'asc' | 'desc'

export function useOrdenacaoPaginacao<T>(
  dados: T[],
  colunaInicial: string,
  direcaoInicial: Direcao = 'asc',
  itensPorPaginaInicial = 10,
) {
  const [coluna, setColuna] = useState(colunaInicial)
  const [direcao, setDirecao] = useState<Direcao>(direcaoInicial)
  const [pagina, setPagina] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(itensPorPaginaInicial)

  const ordenados = useMemo(() => {
    const copia = [...dados]
    copia.sort((a, b) => {
      const va = (a as Record<string, unknown>)[coluna]
      const vb = (b as Record<string, unknown>)[coluna]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else if (va instanceof Date && vb instanceof Date) cmp = va.getTime() - vb.getTime()
      else cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
      return direcao === 'asc' ? cmp : -cmp
    })
    return copia
  }, [dados, coluna, direcao])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / itensPorPagina))

  const paginaAtual = Math.min(pagina, totalPaginas)

  const dadosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return ordenados.slice(inicio, inicio + itensPorPagina)
  }, [ordenados, paginaAtual, itensPorPagina])

  const alternarOrdenacao = (novaColuna: string) => {
    if (novaColuna === coluna) {
      setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setColuna(novaColuna)
      setDirecao('asc')
    }
    setPagina(1)
  }

  const irParaPagina = (p: number) => setPagina(Math.max(1, Math.min(p, totalPaginas)))

  const setItensPorPaginaComReset = (n: number) => {
    setItensPorPagina(n)
    setPagina(1)
  }

  return {
    dadosPaginados,
    ordenacao: { coluna, direcao },
    alternarOrdenacao,
    pagina: paginaAtual,
    totalPaginas,
    irParaPagina,
    itensPorPagina,
    setItensPorPagina: setItensPorPaginaComReset,
    totalItens: dados.length,
  }
}
