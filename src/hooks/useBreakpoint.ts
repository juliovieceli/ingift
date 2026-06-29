import { useEffect, useState } from 'react'

const QUERIES = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
} as const

function lerMedia(query: string): boolean {
  return window.matchMedia(query).matches
}

export function useBreakpoint() {
  const [ehMobile, setEhMobile] = useState(() => !lerMedia(QUERIES.md))
  const [ehTablet, setEhTablet] = useState(() => !lerMedia(QUERIES.lg))

  useEffect(() => {
    const mediaMd = window.matchMedia(QUERIES.md)
    const mediaLg = window.matchMedia(QUERIES.lg)

    const atualizar = () => {
      setEhMobile(!mediaMd.matches)
      setEhTablet(!mediaLg.matches)
    }

    atualizar()
    mediaMd.addEventListener('change', atualizar)
    mediaLg.addEventListener('change', atualizar)
    return () => {
      mediaMd.removeEventListener('change', atualizar)
      mediaLg.removeEventListener('change', atualizar)
    }
  }, [])

  return { ehMobile, ehTablet }
}
