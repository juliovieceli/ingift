import { useState } from 'react'
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

function valoresIniciais(item: PortfolioItem | null) {
  if (item) {
    return {
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      urlImagem: item.urlImagem,
      ordem: item.ordem,
      publicado: item.publicado,
    }
  }
  return {
    titulo: '',
    descricao: '',
    urlImagem: '/imagens/portfolio-01.jpg',
    ordem: 99,
    publicado: false,
  }
}

function FormularioPortfolio({
  item,
  onFechar,
  onSalvo,
}: {
  item: PortfolioItem | null
  onFechar: () => void
  onSalvo: () => void
}) {
  const init = valoresIniciais(item)
  const [titulo, setTitulo] = useState(init.titulo)
  const [descricao, setDescricao] = useState(init.descricao)
  const [urlImagem, setUrlImagem] = useState(init.urlImagem)
  const [ordem, setOrdem] = useState(init.ordem)
  const [publicado, setPublicado] = useState(init.publicado)
  const [erro, setErro] = useState('')

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
  )
}

export function ModalPortfolio({ aberto, item, onFechar, onSalvo }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={item ? 'Editar item' : 'Novo item de portfólio'} largura="lg">
      {aberto && (
        <FormularioPortfolio
          key={item?.id ?? 'novo'}
          item={item}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
