import { useEffect, useRef, useState } from 'react'

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.12) {
  const ref = useRef<T>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzir) {
      setVisivel(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visivel, className: visivel ? 'reveal reveal-visible' : 'reveal' }
}
