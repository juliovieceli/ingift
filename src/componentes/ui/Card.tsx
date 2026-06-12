import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function TituloCard({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary-500">
      {children}
    </h3>
  )
}
