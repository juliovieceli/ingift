import { useRef } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTiltCard } from '@/hooks/useTiltCard'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import type { ItemServico } from './conteudoServicos'

interface Props {
  titulo: string
  itens: ItemServico[]
}

function CardServico({ item, indice }: { item: ItemServico; indice: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { hoverCapaz, animar } = usePrefersMotion()
  useTiltCard(ref, hoverCapaz && animar)

  return (
    <div
      ref={ref}
      className="group relative flex min-h-[11rem] flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-6 text-center transition-[border-color,box-shadow] duration-300 hover:border-secondary-500 hover:shadow-lg active:scale-[0.98]"
      style={{ transitionDelay: `${indice * 80}ms` }}
    >
      <div className="mx-auto mb-3 h-2 w-8 rounded bg-secondary-500 transition-all duration-300 group-hover:w-12" />
      <p className="font-medium text-[var(--texto)] transition-transform duration-300 group-hover:-translate-y-0.5">
        {item.titulo}
      </p>
      {item.descricao && (
        <p
          className="
            mt-2 max-h-none text-sm leading-relaxed text-[var(--texto-muted)] opacity-100
            md:mt-0 md:max-h-0 md:overflow-hidden md:opacity-0
            md:transition-all md:duration-300 md:ease-out
            md:group-hover:mt-3 md:group-hover:max-h-28 md:group-hover:opacity-100
          "
        >
          {item.descricao}
        </p>
      )}
    </div>
  )
}

export function SecaoServicos({ titulo, itens }: Props) {
  const { ref, className } = useScrollReveal()

  return (
    <section id="servicos" ref={ref} className={`secao-lazy px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--texto)]">{titulo}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((item, idx) => (
            <CardServico key={item.titulo} item={item} indice={idx} />
          ))}
        </div>
      </div>
    </section>
  )
}
