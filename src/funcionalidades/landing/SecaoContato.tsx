import { Botao } from '@/componentes/ui/Botao'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { LinksRedesSociais } from './LinksRedesSociais'
import type { ContatoLanding } from './contatoLanding'

interface Props {
  whatsapp: string
  contato: ContatoLanding | undefined
  temRedes: boolean
}

export function SecaoContato({ whatsapp, contato, temRedes }: Props) {
  const { ref, className } = useScrollReveal()

  return (
    <section id="contato" ref={ref} className={`bg-primary-900 px-4 py-16 text-white ${className}`}>
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-10 md:flex-row md:items-start md:gap-16">
        {temRedes && (
          <div className="flex max-w-xs flex-col items-center text-center md:flex-1">
            <h2 className="text-2xl font-bold">Siga-nos nas redes sociais</h2>
            <p className="mt-3 text-sm text-primary-200">
              Acompanhe nossos trabalhos e novidades.
            </p>
            <LinksRedesSociais contato={contato} variante="claro" className="mt-6 justify-center" />
          </div>
        )}

        <div className="flex max-w-xs flex-col items-center text-center md:flex-1">
          <h2 className="text-2xl font-bold">Fale conosco</h2>
          <p className="mt-3 text-sm text-primary-200">
            Tire suas dúvidas ou solicite um orçamento pelo WhatsApp.
          </p>
          <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-6 inline-block">
            <Botao variante="secundario">Chamar no WhatsApp</Botao>
          </a>
          {contato?.email && <p className="mt-4 text-sm text-primary-300">{contato.email}</p>}
          {contato?.endereco && <p className="mt-2 text-sm text-primary-300">{contato.endereco}</p>}
        </div>
      </div>
    </section>
  )
}
