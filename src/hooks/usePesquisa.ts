import { useEffect, useMemo, useState } from 'react'

export function usePesquisa<T>(
  dados: T[],
  extrairTexto: (item: T) => string,
  debounceMs = 0,
) {
  const [termo, setTermo] = useState('')
  const [termoDebounced, setTermoDebounced] = useState('')

  useEffect(() => {
    if (debounceMs === 0) {
      setTermoDebounced(termo)
      return
    }
    const t = setTimeout(() => setTermoDebounced(termo), debounceMs)
    return () => clearTimeout(t)
  }, [termo, debounceMs])

  const filtrados = useMemo(() => {
    const q = termoDebounced.trim().toLowerCase()
    if (!q) return dados
    const tokens = q.split(/\s+/).filter(Boolean)
    return dados.filter((item) => {
      const hay = extrairTexto(item).toLowerCase()
      return tokens.every((t) => hay.includes(t))
    })
  }, [dados, termoDebounced, extrairTexto])

  return { termo, setTermo, filtrados }
}
