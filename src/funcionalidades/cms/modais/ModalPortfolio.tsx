import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { PortfolioItem } from '@/tipos/database'

interface Props {
  aberto: boolean
  item: PortfolioItem | null
  onFechar: () => void
  onSalvo: () => void
}

export function ModalPortfolio({ aberto, item, onFechar, onSalvo }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [urlImagem, setUrlImagem] = useState('/imagens/portfolio-01.jpg')
  const [ordem, setOrdem] = useState(99)
  const [publicado, setPublicado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (item) {
      setTitulo(item.titulo)
      setDescricao(item.descricao ?? '')
      setUrlImagem(item.urlImagem)
      setOrdem(item.ordem)
      setPublicado(item.publicado)
    } else {
      setTitulo('')
      setDescricao('')
      setUrlImagem('/imagens/portfolio-01.jpg')
      setOrdem(99)
      setPublicado(false)
    }
    setErro('')
  }, [item, aberto])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const payload = {
        titulo,
        descricao: descricao || null,
        urlImagem,
        ordem,
        publicado,
      }
      if (item) {
        const { error } = await supabase.from('PortfolioItem').update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('PortfolioItem').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={item ? 'Editar item' : 'Novo item de portfólio'} largura="lg">
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
        {urlImagem && (
          <img src={urlImagem} alt={titulo || 'Preview'} className="h-40 w-full rounded-lg object-cover" />
        )}
        <Input rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        <Input rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Input rotulo="URL imagem" value={urlImagem} onChange={(e) => setUrlImagem(e.target.value)} required />
        <Input rotulo="Ordem" type="number" value={ordem} onChange={(e) => setOrdem(+e.target.value)} />
        <Checkbox rotulo="Publicado" checked={publicado} onChange={setPublicado} />
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={!titulo || salvar.isPending}>Salvar</Botao>
        </div>
      </form>
    </Modal>
  )
}
