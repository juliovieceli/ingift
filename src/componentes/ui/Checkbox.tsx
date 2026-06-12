interface Props {
  rotulo: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox({ rotulo, checked, onChange, disabled }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-[var(--borda)]"
      />
      <span className="text-[var(--texto-secundario)]">{rotulo}</span>
    </label>
  )
}
