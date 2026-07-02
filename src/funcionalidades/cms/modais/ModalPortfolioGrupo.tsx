import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { CampoImagensCms, removerImagensCms } from '@/componentes/ui/CampoImagensCms'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { PortfolioGrupo } from '@/tipos/database'

interface Props {
  aberto: boolean
  grupo: PortfolioGrupo | null
  onFechar: () => void
  onSalvo: () => void
}

function valoresIniciais(grupo: PortfolioGrupo | null) {
  if (grupo) {
    return {
      nome: grupo.nome,
      descricao: grupo.descricao ?? '',
      urlsImagem: grupo.urlsImagem,
      ordem: grupo.ordem,
      publicado: grupo.publicado,
    }
  }
  return {
    nome: '',
    descricao: '',
    urlsImagem: [] as string[],
    ordem: 99,
    publicado: false,
  }
}

function FormularioPortfolioGrupo({
  grupo,
  onFechar,
  onSalvo,
}: {
  grupo: PortfolioGrupo | null
  onFechar: () => void
  onSalvo: () => void
}) {
  const init = valoresIniciais(grupo)
  const [nome, setNome] = useState(init.nome)
  const [descricao, setDescricao] = useState(init.descricao)
  const [urlsImagem, setUrlsImagem] = useState(init.urlsImagem)
  const [ordem, setOrdem] = useState(init.ordem)
  const [publicado, setPublicado] = useState(init.publicado)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const v = valoresIniciais(grupo)
    setNome(v.nome)
    setDescricao(v.descricao)
    setUrlsImagem(v.urlsImagem)
    setOrdem(v.ordem)
    setPublicado(v.publicado)
    setErro('')
  }, [grupo])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (!nome.trim()) throw new Error('Informe o nome do grupo')

      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        urlsImagem,
        ordem,
        publicado,
      }

      if (grupo) {
        const { error } = await supabase.from('PortfolioGrupo').update(payload).eq('id', grupo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('PortfolioGrupo').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      if (!supabase || !grupo) throw new Error('Grupo inválido')
      if (!confirm(`Excluir o grupo "${grupo.nome}"? Os itens permanecem, mas deixam de pertencer a este grupo.`)) return
      await removerImagensCms(grupo.urlsImagem)
      const { error } = await supabase.from('PortfolioGrupo').delete().eq('id', grupo.id)
      if (error) throw error
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const pendente = salvar.isPending || excluir.isPending

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
      <Input rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Descrição breve</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={3}
          placeholder="Texto exibido no card do grupo na home"
        />
      </label>
      <CampoImagensCms
        valor={urlsImagem}
        onChange={setUrlsImagem}
        preset="portfolio"
        rotulo="Imagens do grupo"
      />
      <p className="text-xs text-[var(--texto-muted)]">
        Opcional. Se vazio, usa a imagem do primeiro item publicado do grupo.
      </p>
      <Input rotulo="Ordem" type="number" value={ordem} onChange={(e) => setOrdem(+e.target.value)} />
      <Checkbox rotulo="Publicado" checked={publicado} onChange={setPublicado} />
      {erro && <p className="text-sm text-erro">{erro}</p>}
      <div className="flex items-center justify-between gap-2">
        {grupo ? (
          <Botao
            type="button"
            variante="fantasma"
            className="text-erro hover:bg-erro/10"
            onClick={() => excluir.mutate()}
            disabled={pendente}
          >
            {excluir.isPending ? 'Excluindo...' : 'Excluir grupo'}
          </Botao>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar} disabled={pendente}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={!nome.trim() || pendente}>
            Salvar
          </Botao>
        </div>
      </div>
    </form>
  )
}

export function ModalPortfolioGrupo({ aberto, grupo, onFechar, onSalvo }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={grupo ? 'Editar grupo' : 'Novo grupo de portfólio'} largura="lg">
      {aberto && (
        <FormularioPortfolioGrupo
          key={grupo?.id ?? 'novo'}
          grupo={grupo}
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      )}
    </Modal>
  )
}
