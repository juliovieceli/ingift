import { useEffect, type RefObject } from 'react'

export function useTiltCard(ref: RefObject<HTMLElement | null>, ativo: boolean, maxGrau = 8) {
  useEffect(() => {
    const el = ref.current
    if (!el || !ativo) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.transform = `perspective(800px) rotateX(${-y * maxGrau}deg) rotateY(${x * maxGrau}deg) scale3d(1.02, 1.02, 1.02)`
    }

    const onLeave = () => {
      el.style.transform = ''
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.style.transform = ''
    }
  }, [ref, ativo, maxGrau])
}
