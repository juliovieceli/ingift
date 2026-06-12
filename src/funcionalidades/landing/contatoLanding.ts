export type ContatoLanding = {
  whatsapp?: string
  email?: string
  endereco?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  shopee?: string
}

export function linkWhatsapp(numero?: string) {
  if (!numero?.trim()) return null
  return `https://wa.me/${numero.replace(/\D/g, '')}`
}

export function normalizarUrl(url: string) {
  const limpo = url.trim()
  if (!limpo) return ''
  if (/^https?:\/\//i.test(limpo)) return limpo
  return `https://${limpo}`
}

export function listarRedesSociais(contato?: ContatoLanding) {
  if (!contato) return []
  return [
    { id: 'instagram', url: contato.instagram ?? '', rotulo: 'Instagram' },
    { id: 'tiktok', url: contato.tiktok ?? '', rotulo: 'TikTok' },
    { id: 'youtube', url: contato.youtube ?? '', rotulo: 'YouTube' },
    { id: 'shopee', url: contato.shopee ?? '', rotulo: 'Shopee' },
  ].filter((rede) => rede.url.trim())
}
