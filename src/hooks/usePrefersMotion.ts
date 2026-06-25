import { useEffect, useState } from 'react'

export function usePrefersMotion() {
  const [state, setState] = useState(() => ({
    reduzirMovimento: false,
    pointerFine: false,
    hoverCapaz: false,
  }))

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(pointer: fine)')
    const hover = window.matchMedia('(hover: hover)')

    const sync = () => {
      setState({
        reduzirMovimento: reduced.matches,
        pointerFine: fine.matches,
        hoverCapaz: hover.matches,
      })
    }

    sync()
    reduced.addEventListener('change', sync)
    fine.addEventListener('change', sync)
    hover.addEventListener('change', sync)
    return () => {
      reduced.removeEventListener('change', sync)
      fine.removeEventListener('change', sync)
      hover.removeEventListener('change', sync)
    }
  }, [])

  return {
    ...state,
    animar: !state.reduzirMovimento,
    interativo: !state.reduzirMovimento && state.pointerFine,
  }
}
