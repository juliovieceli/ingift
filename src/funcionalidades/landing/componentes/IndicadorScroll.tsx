import { ChevronDown } from 'lucide-react'
import { scrollParaSecao } from '@/funcionalidades/landing/scrollSecao'

export function IndicadorScroll() {
  return (
    <a
      href="#servicos"
      onClick={(e) => {
        e.preventDefault()
        window.history.replaceState(null, '', '#servicos')
        scrollParaSecao('servicos')
      }}
      className="indicador-scroll mt-16 flex flex-col items-center gap-1 text-primary-300 transition hover:text-white"
      aria-label="Role para ver mais"
    >
      <span className="text-xs uppercase tracking-widest">Explore</span>
      <ChevronDown className="h-5 w-5" />
    </a>
  )
}
