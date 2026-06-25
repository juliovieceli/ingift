import { useRef, useState } from 'react'
import { useParallaxMouse } from '@/hooks/useParallaxMouse'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'

interface Props {
  children?: React.ReactNode
}

export function FundoHeroInterativo({ children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const { interativo, animar } = usePrefersMotion()
  const [orbOffset, setOrbOffset] = useState({ x: 0, y: 0 })

  useParallaxMouse(ref, interativo, (x, y) => {
    setOrbOffset({
      x: (x - 50) * 0.4,
      y: (y - 50) * 0.4,
    })
  })

  return (
    <section
      ref={ref}
      className="relative flex min-h-[85svh] items-center overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-secondary-950 px-4 py-20 text-white"
    >
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      {interativo && <div className="hero-spotlight pointer-events-none absolute inset-0" aria-hidden />}

      <div
        className={`pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl ${animar ? 'orb-float' : ''}`}
        style={interativo ? { transform: `translate3d(${orbOffset.x}px, ${orbOffset.y}px, 0)` } : undefined}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-secondary-500/25 blur-3xl ${animar ? 'orb-float-delay' : ''}`}
        style={interativo ? { transform: `translate3d(${-orbOffset.x * 0.6}px, ${-orbOffset.y * 0.6}px, 0)` } : undefined}
        aria-hidden
      />
      {!interativo && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/10 blur-3xl" aria-hidden />
      )}

      <div className="relative z-10 mx-auto w-full max-w-4xl">{children}</div>
    </section>
  )
}
