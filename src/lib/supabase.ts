import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

/** Novos projetos: sb_publishable_... | Legado: JWT anon */
export const chavePublica =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && chavePublica)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, chavePublica!)
  : null
