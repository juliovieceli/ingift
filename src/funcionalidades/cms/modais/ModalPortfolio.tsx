import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { CampoImagemCms } from '@/componentes/ui/CampoImagemCms'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { CampoGrupoPortfolio } from '@/funcionalidades/cms/CampoGrupoPortfolio'
import { extrairCaminhoStorage, removerImagemCms } from '@/lib/storageImagem'
import type { PortfolioItem } from '@/tipos/database'

interface Props {
  aberto: boolean
  item: PortfolioItem | null
  onFechar: () => void
  onSalvo: () => void
}

function urlValida(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function valoresIniciais(item: PortfolioItem | null) {
  if (item) {
    return {
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      urlImagem: item.urlImagem,
      urlLoja: item.urlLoja ?? '',
      grupo: item.grupo ?? '',
      ordem: item.ordem,
      publicado: item.publicado,
    }
  }
  return {
    titulo: '',
    descricao: '',
    urlImagem: '',
    urlLoja: '',
    grupo: '',
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
  const [urlLoja, setUrlLoja] = useState(init.urlLoja)
  const [grupo, setGrupo] = useState(init.grupo)
  const [ordem, setOrdem] = useState(init.ordem)
  const [publicado, setPublicado] = useState(init.publicado)
  const [erro, setErro] = useState('')

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!urlImagem) throw new Error('Selecione uma imagem')
      if (urlLoja.trim() && !urlValida(urlLoja.trim())) {
        throw new Error('Link da loja inválido. Use http:// ou https://')
      }

      const payload = {
        titulo,
        descricao: descricao || null,
        urlImagem,
        urlLoja: urlLoja.trim() || null,
        grupo: grupo.trim() || null,
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

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !item) throw new Error('Item inválido')
      if (!confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.`)) return
      if (extrairCaminhoStorage(item.urlImagem)) {
        await removerImagemCms(item.urlImagem)
      }
      const { error } = await supabase.from('PortfolioItem').delete().eq('id', item.id)
      if (error) throw error
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const pendente = salvar.isPending || excluir.isPending

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
      <CampoImagemCms
        valor={urlImagem}
        onChange={setUrlImagem}
        preset="portfolio"
        rotulo="Imagem"
        obrigatorio
      />
      <Input rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      <CampoGrupoPortfolio valor={grupo} onChange={setGrupo} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Descrição</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={4}
        />
      </label>
      <Input
        rotulo="Link da loja"
        value={urlLoja}
        onChange={(e) => setUrlLoja(e.target.value)}
        placeholder="https://shopee.com.br/..."
      />
      <p className="text-xs text-[var(--texto-muted)]">
        Opcional. Se preenchido, exibe o botão &quot;Quero esse&quot; no site.
      </p>
      <Input rotulo="Ordem" type="number" value={ordem} onChange={(e) => setOrdem(+e.target.value)} />
      <Checkbox rotulo="Publicado" checked={publicado} onChange={setPublicado} />
      {erro && <p className="text-sm text-erro">{erro}</p>}
      <div className="flex items-center justify-between gap-2">
        {item ? (
          <Botao
            type="button"
            variante="fantasma"
            className="text-erro hover:bg-erro/10"
            onClick={() => excluir.mutate()}
            disabled={pendente}
          >
            {excluir.isPending ? 'Excluindo...' : 'Excluir item'}
          </Botao>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar} disabled={pendente}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={!titulo || !urlImagem || pendente}>
            Salvar
          </Botao>
        </div>
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
