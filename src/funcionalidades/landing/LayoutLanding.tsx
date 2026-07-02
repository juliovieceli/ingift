import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { TemaToggle } from '@/componentes/TemaToggle'
import { SplashLanding } from './componentes/SplashLanding'
import { parseConteudoMarca } from './conteudoMarca'
import { LinkSecao } from './LinkSecao'
import { scrollParaSecao } from './scrollSecao'
import { useLandingDados } from './useLandingDados'
import { Rodape } from './Rodape'

export function LayoutLanding() {
  const { carregando, secao } = useLandingDados()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/') return
    const id = location.hash.replace(/^#/, '')
    if (!id) return
    const timer = window.setTimeout(() => scrollParaSecao(id), 80)
    return () => clearTimeout(timer)
  }, [location.pathname, location.hash])

  if (carregando) {
    return <SplashLanding />
  }

  const marca = parseConteudoMarca(secao('marca')?.conteudo)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--borda)] bg-[var(--superficie)]/95 backdrop-blur">
        <div className="mx-auto flex min-h-12 max-w-6xl items-center justify-between px-4 py-1.5">
          <Link to="/" className="flex h-[calc(3rem-0.75rem)] items-center gap-2">
            <img
              src={marca.urlLogo}
              alt={marca.nomeMarca}
              className="block h-full max-h-full w-auto max-w-[min(100%,14rem)] object-contain object-left"
            />
            <span className="hidden font-bold text-[var(--texto)] sm:inline">{marca.nomeMarca}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <LinkSecao id="servicos" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Serviços
            </LinkSecao>
            <LinkSecao id="portfolio" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Portfólio
            </LinkSecao>
            <LinkSecao id="contato" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Contato
            </LinkSecao>
            <TemaToggle />
          </nav>
        </div>
      </header>
      <main className="entrada-hero flex-1">
        <Outlet />
      </main>
      <Rodape nomeMarca={marca.nomeMarca} />
    </div>
  )
}
