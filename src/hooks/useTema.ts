import { useCallback, useEffect, useState } from 'react'

export type ModoTema = 'light' | 'dark' | 'sistema'

const CHAVE = 'ingift-tema'

function aplicarTema(modo: ModoTema) {
  const prefereDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = modo === 'dark' || (modo === 'sistema' && prefereDark)
  document.documentElement.classList.toggle('dark', dark)
}

function lerPreferencia(): ModoTema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'light' || salvo === 'dark') return salvo
  return 'sistema'
}

export function useTema() {
  const [modo, setModo] = useState<ModoTema>(lerPreferencia)

  useEffect(() => {
    aplicarTema(modo)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const ouvir = () => {
      if (lerPreferencia() === 'sistema') aplicarTema('sistema')
    }
    media.addEventListener('change', ouvir)
    return () => media.removeEventListener('change', ouvir)
  }, [modo])

  const alternar = useCallback(() => {
    const proximo = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    localStorage.setItem(CHAVE, proximo)
    setModo(proximo)
  }, [])

  return { modo, alternar }
}
