import type { FocusEvent } from 'react'

export function selecionarTextoAoFocar(
  e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  e.currentTarget.select()
}
