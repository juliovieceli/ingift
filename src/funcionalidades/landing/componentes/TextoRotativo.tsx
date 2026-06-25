import { useEffect, useState } from 'react'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'

interface Props {
  frases: string[]
  intervaloMs?: number
}

export function TextoRotativo({ frases, intervaloMs = 3000 }: Props) {
  const { animar } = usePrefersMotion()
  const [indice, setIndice] = useState(0)
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    if (!animar || frases.length <= 1) return

    const timer = setInterval(() => {
      setSaindo(true)
      setTimeout(() => {
        setIndice((i) => (i + 1) % frases.length)
        setSaindo(false)
      }, 300)
    }, intervaloMs)

    return () => clearInterval(timer)
  }, [animar, frases.length, intervaloMs])

  const fraseAtual = frases[indice] ?? frases[0] ?? ''

  return (
    <span
      className={`inline-block texto-gradiente ${saindo ? 'texto-rotativo-sai' : 'texto-rotativo-entra'}`}
      key={animar ? `${indice}-${saindo}` : 'static'}
    >
      {fraseAtual}
    </span>
  )
}
