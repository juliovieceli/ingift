import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { CampoImagensCms, removerImagensCms } from '@/componentes/ui/CampoImagensCms'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { CampoGrupoPortfolio } from '@/funcionalidades/cms/CampoGrupoPortfolio'
import type { PortfolioItem } from '@/tipos/database'

interface Props {
  aberto: boolean
  item: PortfolioItem | null
  grupoIdsIniciais: string[]
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

function valoresIniciais(item: PortfolioItem | null, grupoIds: string[]) {
  if (item) {
    return {
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      urlsImagem: item.urlsImagem,
      urlLoja: item.urlLoja ?? '',
      grupoIds,
      ordem: item.ordem,
      publicado: item.publicado,
    }
  }
  return {
    titulo: '',
    descricao: '',
    urlsImagem: [] as string[],
    urlLoja: '',
    grupoIds: [] as string[],
    ordem: 99,
    publicado: false,
  }
}

async function sincronizarGrupos(itemId: string, grupoIds: string[]) {
  if (!supabase) throw new Error('Supabase não configurado')

  const { error: delErr } = await supabase
    .from('PortfolioItemGrupo')
    .delete()
    .eq('itemId', itemId)
  if (delErr) throw delErr

  if (grupoIds.length === 0) return

  const { error: insErr } = await supabase
    .from('PortfolioItemGrupo')
    .insert(grupoIds.map((grupoId) => ({ itemId, grupoId })))
  if (insErr) throw insErr
}

function FormularioPortfolio({
  item,
  grupoIdsIniciais,
  onFechar,
  onSalvo,
}: {
  item: PortfolioItem | null
  grupoIdsIniciais: string[]
  onFechar: () => void
  onSalvo: () => void
}) {
  const init = valoresIniciais(item, grupoIdsIniciais)
  const [titulo, setTitulo] = useState(init.titulo)
  const [descricao, setDescricao] = useState(init.descricao)
  const [urlsImagem, setUrlsImagem] = useState(init.urlsImagem)
  const [urlLoja, setUrlLoja] = useState(init.urlLoja)
  const [grupoIds, setGrupoIds] = useState(init.grupoIds)
  const [ordem, setOrdem] = useState(init.ordem)
  const [publicado, setPublicado] = useState(init.publicado)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const v = valoresIniciais(item, grupoIdsIniciais)
    setTitulo(v.titulo)
    setDescricao(v.descricao)
    setUrlsImagem(v.urlsImagem)
    setUrlLoja(v.urlLoja)
    setGrupoIds(v.grupoIds)
    setOrdem(v.ordem)
    setPublicado(v.publicado)
    setErro('')
  }, [item, grupoIdsIniciais])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (urlsImagem.length === 0) throw new Error('Selecione ao menos uma imagem')
      if (urlLoja.trim() && !urlValida(urlLoja.trim())) {
        throw new Error('Link da loja inválido. Use http:// ou https://')
      }

      const payload = {
        titulo,
        descricao: descricao || null,
        urlsImagem,
        urlLoja: urlLoja.trim() || null,
        ordem,
        publicado,
      }

      if (item) {
        const { error } = await supabase.from('PortfolioItem').update(payload).eq('id', item.id)
        if (error) throw error
        await sincronizarGrupos(item.id, grupoIds)
      } else {
        const { data, error } = await supabase.from('PortfolioItem').insert(payload).select('id').single()
        if (error) throw error
        await sincronizarGrupos(data.id, grupoIds)
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !item) throw new Error('Item inválido')
      if (!confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.`)) return
      await removerImagensCms(item.urlsImagem)
      const { error } = await supabase.from('PortfolioItem').delete().eq('id', item.id)
      if (error) throw error
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const pendente = salvar.isPending || excluir.isPending

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
      <CampoImagensCms
        valor={urlsImagem}
        onChange={setUrlsImagem}
        preset="portfolio"
        rotulo="Imagens"
        obrigatorio
      />
      <Input rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      <CampoGrupoPortfolio valor={grupoIds} onChange={setGrupoIds} />
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
          <Botao type="submit" disabled={!titulo || urlsImagem.length === 0 || pendente}>
            Salvar
          </Botao>
        </div>
      </div>
    </form>
  )
}

export function ModalPortfolio({ aberto, item, grupoIdsIniciais, onFechar, onSalvo }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={item ? 'Editar item' : 'Novo item de portfólio'} largura="lg">
      {aberto && (
        <FormularioPortfolio
          key={item?.id ?? 'novo'}
          item={item}
          grupoIdsIniciais={grupoIdsIniciais}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
