import { TemaToggle } from '@/componentes/TemaToggle'
import { useAuth } from '@/contextos/AuthContext'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { supabaseConfigurado } from '@/lib/supabase'
import {
  ArrowLeftRight,
  ClipboardList,
  Cog,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PenLine,
  Printer,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'

const links = [
  { to: '/admin', fim: true, rotulo: 'Dashboard', icone: LayoutDashboard },
  { to: '/admin/clientes', rotulo: 'Clientes', icone: Users },
  { to: '/admin/estoque', rotulo: 'Estoque', icone: Package },
  { to: '/admin/orcamentos', rotulo: 'Orçamentos', icone: ClipboardList },
  { to: '/admin/movimentacoes', rotulo: 'Movimentações', icone: ArrowLeftRight },
  { to: '/admin/financeiro', rotulo: 'Financeiro', icone: Wallet },
  { to: '/admin/impressoras', rotulo: 'Impressoras', icone: Printer },
  { to: '/admin/cms', rotulo: 'Conteúdo', icone: PenLine },
  { to: '/admin/configuracoes', rotulo: 'Configurações', icone: Cog },
]

function ConteudoSidebar({ onNavegar }: { onNavegar?: () => void }) {
  const { sair } = useAuth()

  return (
    <>
      <div className="flex items-center gap-2 border-b border-[var(--borda)] p-4">
        <img src="/marca/sublogo.png" alt="InGift" className="h-8" />
        <span className="font-bold text-sm text-[var(--texto)]">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ to, fim, rotulo, icone: Icone }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            onClick={onNavegar}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-secondary-500/15 text-secondary-600 dark:text-secondary-400'
                  : 'text-[var(--texto-secundario)] hover:bg-[var(--superficie-elevada)]'
              }`
            }
          >
            <Icone className="h-4 w-4 shrink-0" />
            {rotulo}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[var(--borda)] p-3">
        <button
          type="button"
          onClick={() => sair()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--texto-secundario)] hover:bg-[var(--superficie-elevada)]"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  )
}

export function LayoutAdmin() {
  const { carregando, ehAdminAtivo } = useAuth()
  const { ehTablet } = useBreakpoint()
  const [menuAberto, setMenuAberto] = useState(false)
  const drawerVisivel = ehTablet && menuAberto

  useEffect(() => {
    if (!drawerVisivel) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [drawerVisivel])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--texto-muted)]">
        Carregando...
      </div>
    )
  }

  if (!ehAdminAtivo) return <Navigate to="/admin/login" replace />

  const fecharMenu = () => setMenuAberto(false)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--borda)] bg-[var(--superficie)] lg:flex">
        <ConteudoSidebar />
      </aside>

      {/* Drawer mobile/tablet */}
      {drawerVisivel && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50"
            onClick={fecharMenu}
          />
          <aside className="relative flex h-full w-56 max-w-[85vw] flex-col bg-[var(--superficie)] shadow-xl">
            <button
              type="button"
              onClick={fecharMenu}
              className="absolute top-3 right-3 rounded-lg p-1 text-[var(--texto-muted)] hover:bg-[var(--superficie-elevada)]"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <ConteudoSidebar onNavegar={fecharMenu} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--borda)] px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {ehTablet && (
              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                className="rounded-lg p-2 text-[var(--texto-secundario)] hover:bg-[var(--superficie-elevada)] lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h1 className="truncate text-lg font-semibold text-[var(--texto)]">Painel InGift</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!supabaseConfigurado && (
              <span className="hidden rounded bg-alerta/20 px-2 py-1 text-xs text-alerta sm:inline">
                Supabase não configurado
              </span>
            )}
            <TemaToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
