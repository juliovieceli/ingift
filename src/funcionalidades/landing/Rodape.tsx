interface Props {
  nomeMarca?: string
}

export function Rodape({ nomeMarca = 'InGift' }: Props) {
  return (
    <footer className="border-t border-[var(--borda)] py-6">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm text-[var(--texto-muted)]">
          © {new Date().getFullYear()} {nomeMarca} — Impressão 3D
        </p>
      </div>
    </footer>
  )
}
