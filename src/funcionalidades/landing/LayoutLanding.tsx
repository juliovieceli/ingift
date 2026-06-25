import { Link, Outlet } from 'react-router-dom'
import { TemaToggle } from '@/componentes/TemaToggle'
import { parseConteudoMarca } from './conteudoMarca'
import { useLandingDados } from './useLandingDados'
import { Rodape } from './Rodape'

export function LayoutLanding() {
  const { secao } = useLandingDados()
  const marca = parseConteudoMarca(secao('marca')?.conteudo)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--borda)] bg-[var(--superficie)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={marca.urlLogo} alt={marca.nomeMarca} className="h-10 w-auto" />
            <span className="hidden font-bold text-[var(--texto)] sm:inline">{marca.nomeMarca}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/#servicos" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Serviços
            </Link>
            <Link to="/#portfolio" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Portfólio
            </Link>
            <Link to="/#contato" className="text-[var(--texto-secundario)] hover:text-secondary-500">
              Contato
            </Link>
            <TemaToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Rodape nomeMarca={marca.nomeMarca} />
    </div>
  )
}
