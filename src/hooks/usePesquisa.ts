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
    return dados.filter((item) => extrairTexto(item).toLowerCase().includes(q))
  }, [dados, termoDebounced, extrairTexto])

  return { termo, setTermo, filtrados }
}
