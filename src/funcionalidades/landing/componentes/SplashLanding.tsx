import { MARCA_PADRAO } from '../conteudoMarca'

export function SplashLanding() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--fundo)]"
      role="status"
      aria-live="polite"
      aria-label="Carregando conteúdo"
    >
      <img
        src={MARCA_PADRAO.urlLogo}
        alt={MARCA_PADRAO.nomeMarca}
        className="splash-logo h-16 w-auto sm:h-20"
      />
      <div className="mt-8 h-1 w-28 overflow-hidden rounded-full bg-[var(--borda)]">
        <div className="splash-bar h-full w-2/5 rounded-full bg-[var(--primaria)]" />
      </div>
      <p className="mt-4 text-sm text-[var(--texto-muted)]">Carregando...</p>
    </div>
  )
}
