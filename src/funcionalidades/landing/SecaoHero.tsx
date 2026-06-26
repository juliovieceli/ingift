import { Botao } from '@/componentes/ui/Botao'
import { usePrefersMotion } from '@/hooks/usePrefersMotion'
import { useRef } from 'react'
import { FundoHeroInterativo } from './componentes/FundoHeroInterativo'
import { IndicadorScroll } from './componentes/IndicadorScroll'
import { TextoRotativo } from './componentes/TextoRotativo'
import type { ConteudoHero } from './conteudoHero'
import type { ConteudoMarca } from './conteudoMarca'

interface Props {
  hero: ConteudoHero
  marca: ConteudoMarca
  whatsapp: string
}

export function SecaoHero({ hero, marca, whatsapp }: Props) {
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const { interativo } = usePrefersMotion()

  const onMouseMoveCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!interativo || !ctaRef.current) return
    const rect = ctaRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15
    ctaRef.current.style.transform = `translate(${x}px, ${y}px)`
  }

  const onMouseLeaveCta = () => {
    if (ctaRef.current) ctaRef.current.style.transform = ''
  }

  const temRotativas = (hero.frasesRotativas?.length ?? 0) > 0
  const delayTitulo = marca.exibirLogoHero ? '150ms' : '0ms'
  const delaySubtitulo = marca.exibirLogoHero ? '300ms' : '150ms'
  const delayCta = marca.exibirLogoHero ? '450ms' : '300ms'
  const delayScroll = marca.exibirLogoHero ? '650ms' : '500ms'

  return (
    <FundoHeroInterativo>
      <div className="flex flex-col items-center text-center">
        {marca.exibirLogoHero && (
          <img
            src={marca.urlLogo}
            alt={marca.nomeMarca}
            className="entrada-hero h-20 w-auto md:h-24"
            style={{ animationDelay: '0ms' }}
          />
        )}

        <h1
          className={`entrada-hero text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl ${marca.exibirLogoHero ? 'mt-8' : 'mt-0'}`}
          style={{ animationDelay: delayTitulo }}
        >
          {hero.titulo}
          {temRotativas && (
            <>
              <br />
              <TextoRotativo frases={hero.frasesRotativas!} />
            </>
          )}
        </h1>

        <p
          className="entrada-hero mt-6 max-w-2xl text-lg text-primary-200 md:text-xl"
          style={{ animationDelay: delaySubtitulo }}
        >
          {hero.subtitulo}
        </p>

        <div
          className="entrada-hero mt-10 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: delayCta }}
        >
          <a
            ref={ctaRef}
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-block transition-transform duration-200"
            onMouseMove={onMouseMoveCta}
            onMouseLeave={onMouseLeaveCta}
          >
            <Botao variante="secundario" className="px-6 py-3 text-base">
              {hero.cta}
            </Botao>
          </a>
          <a
            href="#portfolio"
            className="rounded-lg border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            {hero.ctaSecundario}
          </a>
        </div>

        <div className="entrada-hero" style={{ animationDelay: delayScroll }}>
          <IndicadorScroll />
        </div>
      </div>
    </FundoHeroInterativo>
  )
}
