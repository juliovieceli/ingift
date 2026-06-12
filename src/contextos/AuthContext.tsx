import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import type { Perfil } from '@/tipos/database'

interface AuthContexto {
  usuario: User | null
  perfil: Perfil | null
  carregando: boolean
  ehAdminAtivo: boolean
  entrar: (email: string, senha: string) => Promise<{ erro?: string }>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContexto | null>(null)

async function buscarPerfil(userId: string): Promise<Perfil | null> {
  if (!supabase) return null
  const { data } = await supabase.from('Perfil').select('*').eq('id', userId).single()
  return data as Perfil | null
}

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(supabaseConfigurado)

  const atualizarSessao = useCallback(async (user: User | null) => {
    setUsuario(user)
    if (user) {
      const p = await buscarPerfil(user.id)
      setPerfil(p)
    } else {
      setPerfil(null)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setCarregando(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      atualizarSessao(data.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      atualizarSessao(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [atualizarSessao])

  const entrar = async (email: string, senha: string) => {
    if (!supabase) {
      return {
        erro: 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...).',
      }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return { erro: error.message }
    const user = (await supabase.auth.getUser()).data.user
    if (user) {
      const p = await buscarPerfil(user.id)
      if (!p?.ativo) {
        await supabase.auth.signOut()
        return { erro: 'Usuário sem permissão de admin ativo.' }
      }
    }
    return {}
  }

  const sair = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const ehAdminAtivo = Boolean(perfil?.ativo && perfil?.papel === 'admin')

  return (
    <AuthContext.Provider value={{ usuario, perfil, carregando, ehAdminAtivo, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de ProvedorAuth')
  return ctx
}
