import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Card } from '@/componentes/ui/Card'

export function PaginaLogin() {
  const { ehAdminAtivo, carregando, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!carregando && ehAdminAtivo) return <Navigate to="/admin" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    const res = await entrar(email, senha)
    if (res.erro) setErro(res.erro)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--fundo)] p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/marca/logo.png" alt="InGift" className="mx-auto h-16" />
          <h1 className="mt-4 text-xl font-bold text-[var(--texto)]">Área administrativa</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input rotulo="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          {erro && <p className="text-sm text-erro">{erro}</p>}
          <Botao type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </Botao>
        </form>
      </Card>
    </div>
  )
}
