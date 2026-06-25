import { useEffect, type RefObject } from 'react'

export function useParallaxMouse(
  ref: RefObject<HTMLElement | null>,
  ativo: boolean,
  onMove?: (x: number, y: number, rect: DOMRect) => void,
) {
  useEffect(() => {
    const el = ref.current
    if (!el || !ativo) return

    let raf = 0
    let alvoX = 50
    let alvoY = 50

    const aplicar = () => {
      raf = 0
      el.style.setProperty('--mouse-x', `${alvoX}%`)
      el.style.setProperty('--mouse-y', `${alvoY}%`)
      onMove?.(alvoX, alvoY, el.getBoundingClientRect())
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      alvoX = ((e.clientX - rect.left) / rect.width) * 100
      alvoY = ((e.clientY - rect.top) / rect.height) * 100
      if (!raf) raf = requestAnimationFrame(aplicar)
    }

    el.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref, ativo, onMove])
}
