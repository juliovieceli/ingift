export function parseConteudo(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
    return {}
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}
