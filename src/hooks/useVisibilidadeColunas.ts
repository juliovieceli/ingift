import { useCallback, useMemo, useState } from 'react'

const PREFIXO = 'ingift-colunas-'

function lerSalvo(idTabela: string): string[] | null {
  try {
    const raw = localStorage.getItem(`${PREFIXO}${idTabela}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : null
  } catch {
    return null
  }
}

function salvar(idTabela: string, ids: string[]) {
  localStorage.setItem(`${PREFIXO}${idTabela}`, JSON.stringify(ids))
}

export interface ColunaConfig {
  id: string
  obrigatoria?: boolean
  ocultavel?: boolean
}

function idsPadrao(colunas: ColunaConfig[], padraoMobile?: string[]): string[] {
  if (padraoMobile?.length) {
    const validos = new Set(colunas.map((c) => c.id))
    const filtrados = padraoMobile.filter((id) => validos.has(id))
    const obrigatorias = colunas.filter((c) => c.obrigatoria).map((c) => c.id)
    return [...new Set([...filtrados, ...obrigatorias])]
  }
  return colunas
    .filter((c) => c.ocultavel !== false || c.obrigatoria)
    .map((c) => c.id)
}

function normalizarVisiveis(colunas: ColunaConfig[], ids: string[]): string[] {
  const validos = new Set(colunas.map((c) => c.id))
  const obrigatorias = colunas.filter((c) => c.obrigatoria).map((c) => c.id)
  const filtrados = ids.filter((id) => validos.has(id))
  const resultado = [...new Set([...filtrados, ...obrigatorias])]
  if (resultado.length === 0) {
    return colunas.slice(0, Math.min(3, colunas.length)).map((c) => c.id)
  }
  return resultado
}

export function useVisibilidadeColunas(
  idTabela: string,
  colunas: ColunaConfig[],
  padraoMobile?: string[],
) {
  const configs = useMemo(
    () => colunas.map((c) => ({ ...c, ocultavel: c.ocultavel ?? !c.obrigatoria })),
    [colunas],
  )

  const padrao = useMemo(() => idsPadrao(configs, padraoMobile), [configs, padraoMobile])

  const [visiveis, setVisiveis] = useState<string[]>(() => {
    const salvo = lerSalvo(idTabela)
    if (salvo) return normalizarVisiveis(configs, salvo)
    return padrao
  })

  const colunasVisiveis = useMemo(() => {
    const set = new Set(visiveis)
    return configs.filter((c) => set.has(c.id))
  }, [configs, visiveis])

  const estaVisivel = useCallback((id: string) => visiveis.includes(id), [visiveis])

  const alternar = useCallback(
    (id: string) => {
      const col = configs.find((c) => c.id === id)
      if (!col || col.obrigatoria || col.ocultavel === false) return

      setVisiveis((prev) => {
        const next = prev.includes(id)
          ? prev.filter((v) => v !== id)
          : [...prev, id]
        const normalizado = normalizarVisiveis(configs, next)
        salvar(idTabela, normalizado)
        return normalizado
      })
    },
    [configs, idTabela],
  )

  const aplicar = useCallback(
    (ids: string[]) => {
      const normalizado = normalizarVisiveis(configs, ids)
      setVisiveis(normalizado)
      salvar(idTabela, normalizado)
    },
    [configs, idTabela],
  )

  const resetar = useCallback(() => {
    const normalizado = normalizarVisiveis(configs, padrao)
    setVisiveis(normalizado)
    salvar(idTabela, normalizado)
  }, [configs, idTabela, padrao])

  return {
    visiveis,
    colunasVisiveis,
    estaVisivel,
    alternar,
    aplicar,
    resetar,
    padrao,
  }
}
