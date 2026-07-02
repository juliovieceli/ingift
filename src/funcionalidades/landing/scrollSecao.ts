const OFFSET_EXTRA = 12

function offsetHeader() {
  const header = document.querySelector('header')
  return (header?.getBoundingClientRect().height ?? 0) + OFFSET_EXTRA
}

/** Rola até uma seção da landing, compensando o header fixo. */
export function scrollParaSecao(id: string) {
  const executar = () => {
    const el = document.getElementById(id)
    if (!el) return false

    if (el.classList.contains('reveal')) {
      el.classList.add('reveal-visible')
    }

    const top = el.getBoundingClientRect().top + window.scrollY - offsetHeader()
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    return true
  }

  if (executar()) return
  requestAnimationFrame(() => {
    if (!executar()) setTimeout(executar, 150)
  })
}
