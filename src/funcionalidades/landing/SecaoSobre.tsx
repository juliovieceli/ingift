import { useScrollReveal } from '@/hooks/useScrollReveal'

interface Props {
  titulo: string
  texto: string
}

export function SecaoSobre({ titulo, texto }: Props) {
  const { ref, className } = useScrollReveal()

  return (
    <section ref={ref} className={`secao-lazy px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-[var(--texto)]">{titulo}</h2>
        <p className="mt-6 text-lg text-[var(--texto-secundario)]">{texto}</p>
      </div>
    </section>
  )
}
