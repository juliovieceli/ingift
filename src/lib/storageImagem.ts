import { supabase } from '@/lib/supabase'

const BUCKET = 'public-assets'

export function urlPublicaStorage(caminho: string): string {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
  return data.publicUrl
}

/** Extrai o path interno do bucket a partir de uma URL pública do Storage. */
export function extrairCaminhoStorage(url: string): string | null {
  if (!url) return null
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return null

  const prefixo = `${base}/storage/v1/object/public/${BUCKET}/`
  if (!url.startsWith(prefixo)) return null
  return url.slice(prefixo.length)
}

export async function enviarImagemCms(
  pasta: 'portfolio' | 'marca',
  arquivo: Blob,
  nome?: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado')

  const ext = arquivo.type === 'image/webp' ? 'webp' : 'jpg'
  const caminho =
    pasta === 'portfolio'
      ? `cms/portfolio/${nome ?? crypto.randomUUID()}.${ext}`
      : `cms/marca/logo-${nome ?? Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: true,
  })
  if (error) throw error

  return urlPublicaStorage(caminho)
}

export async function removerImagemCms(url: string): Promise<void> {
  if (!supabase) return
  const caminho = extrairCaminhoStorage(url)
  if (!caminho) return

  const { error } = await supabase.storage.from(BUCKET).remove([caminho])
  if (error) console.warn('Falha ao remover imagem do storage:', error.message)
}
