import { parseConteudo } from '@/lib/parseConteudo'

export const CONTATO_DEFAULTS = {
  whatsapp: '5511999999999',
  email: '',
  endereco: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  shopee: '',
}

export function carregarCamposContato(conteudoRaw: unknown): Record<string, string> {
  const conteudo = parseConteudo(conteudoRaw)
  const base = { ...CONTATO_DEFAULTS, ...conteudo }
  return {
    whatsapp: String(base.whatsapp ?? ''),
    email: String(base.email ?? ''),
    endereco: String(base.endereco ?? ''),
    instagram: String(base.instagram ?? ''),
    tiktok: String(base.tiktok ?? ''),
    youtube: String(base.youtube ?? ''),
    shopee: String(base.shopee ?? ''),
  }
}

export function montarConteudoContato(campos: Record<string, string>) {
  return {
    whatsapp: campos.whatsapp ?? '',
    email: campos.email ?? '',
    endereco: campos.endereco ?? '',
    instagram: campos.instagram ?? '',
    tiktok: campos.tiktok ?? '',
    youtube: campos.youtube ?? '',
    shopee: campos.shopee ?? '',
  }
}
