import { ChevronDown } from 'lucide-react'

export function IndicadorScroll() {
  return (
    <a
      href="#servicos"
      className="indicador-scroll mt-16 flex flex-col items-center gap-1 text-primary-300 transition hover:text-white"
      aria-label="Role para ver mais"
    >
      <span className="text-xs uppercase tracking-widest">Explore</span>
      <ChevronDown className="h-5 w-5" />
    </a>
  )
}
