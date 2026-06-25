import { NavLink, Navigate, Outlet } from 'react-router-dom'
import {
  ArrowLeftRight,
  ClipboardList,
  Cog,
  LayoutDashboard,
  LogOut,
  Package,
  PenLine,
  Printer,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contextos/AuthContext'
import { TemaToggle } from '@/componentes/TemaToggle'
import { supabaseConfigurado } from '@/lib/supabase'

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

export function LayoutAdmin() {
  const { carregando, ehAdminAtivo, sair } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--texto-muted)]">
        Carregando...
      </div>
    )
  }

  if (!ehAdminAtivo) return <Navigate to="/admin/login" replace />

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-[var(--borda)] bg-[var(--superficie)]">
        <div className="flex items-center gap-2 border-b border-[var(--borda)] p-4">
          <img src="/marca/sublogo.png" alt="InGift" className="h-8" />
          <span className="font-bold text-sm text-[var(--texto)]">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map(({ to, fim, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={fim}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-secondary-500/15 text-secondary-600 dark:text-secondary-400'
                    : 'text-[var(--texto-secundario)] hover:bg-[var(--superficie-elevada)]'
                }`
              }
            >
              <Icone className="h-4 w-4" />
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
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--borda)] px-6 py-3">
          <h1 className="text-lg font-semibold text-[var(--texto)]">Painel InGift</h1>
          <div className="flex items-center gap-2">
            {!supabaseConfigurado && (
              <span className="rounded bg-alerta/20 px-2 py-1 text-xs text-alerta">
                Supabase não configurado
              </span>
            )}
            <TemaToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
