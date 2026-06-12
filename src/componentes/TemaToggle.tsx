import { Moon, Sun } from 'lucide-react'
import { useTema } from '@/hooks/useTema'

export function TemaToggle() {
  const { alternar } = useTema()
  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-lg p-2 text-[var(--texto-secundario)] transition hover:bg-[var(--superficie-elevada)]"
      aria-label="Alternar tema"
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
    </button>
  )
}
