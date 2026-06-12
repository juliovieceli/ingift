export function Rodape() {
  return (
    <footer className="border-t border-[var(--borda)] py-6">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm text-[var(--texto-muted)]">
          © {new Date().getFullYear()} InGift — Impressão 3D
        </p>
      </div>
    </footer>
  )
}
