import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import type { SecaoLanding } from '@/tipos/database'

interface Props {
  aberto: boolean
  secao: SecaoLanding | null
  onFechar: () => void
  onSalvo: () => void
}

const NOMES_SECAO: Record<string, string> = {
  hero: 'Home',
  home: 'Home',
  servicos: 'Serviços',
  sobre: 'Sobre',
  contato: 'Contato',
}

const DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    titulo: 'Impressão 3D sob medida',
    subtitulo: 'Transformamos suas ideias em objetos reais',
    cta: 'Solicitar orçamento',
  },
  servicos: {
    itens: ['Prototipagem', 'Peças funcionais', 'Brindes personalizados', 'Peças sob medida'],
  },
  sobre: {
    texto: 'A InGift transforma ideias em objetos com impressão 3D de qualidade.',
  },
  contato: {
    whatsapp: '5511999999999',
    email: '',
    endereco: '',
  },
}

function normalizarSlug(slug: string) {
  return slug === 'home' ? 'hero' : slug
}

function parseConteudo(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
    return {}
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

function carregarCampos(slug: string, conteudoRaw: unknown) {
  const slugNorm = normalizarSlug(slug)
  const conteudo = parseConteudo(conteudoRaw)
  const base = { ...(DEFAULTS[slugNorm] ?? {}), ...conteudo }

  if (slugNorm === 'hero') {
    return {
      titulo: String(base.titulo ?? ''),
      subtitulo: String(base.subtitulo ?? ''),
      cta: String(base.cta ?? ''),
    }
  }
  if (slugNorm === 'servicos') {
    const itens = Array.isArray(base.itens) ? (base.itens as string[]) : []
    return { itens: itens.join('\n') }
  }
  if (slugNorm === 'sobre') {
    return { texto: String(base.texto ?? '') }
  }
  if (slugNorm === 'contato') {
    return {
      whatsapp: String(base.whatsapp ?? ''),
      email: String(base.email ?? ''),
      endereco: String(base.endereco ?? ''),
    }
  }
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v ?? '')]))
}

function montarConteudo(slug: string, campos: Record<string, string>): Record<string, unknown> {
  const slugNorm = normalizarSlug(slug)
  if (slugNorm === 'hero') {
    return { titulo: campos.titulo ?? '', subtitulo: campos.subtitulo ?? '', cta: campos.cta ?? '' }
  }
  if (slugNorm === 'servicos') {
    const itens = (campos.itens ?? '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    return { itens }
  }
  if (slugNorm === 'sobre') {
    return { texto: campos.texto ?? '' }
  }
  if (slugNorm === 'contato') {
    return {
      whatsapp: campos.whatsapp ?? '',
      email: campos.email ?? '',
      endereco: campos.endereco ?? '',
    }
  }
  return { ...campos }
}

function CamposSecao({
  slug,
  campos,
  atualizar,
}: {
  slug: string
  campos: Record<string, string>
  atualizar: (chave: string, valor: string) => void
}) {
  const slugNorm = normalizarSlug(slug)

  if (slugNorm === 'hero') {
    return (
      <div className="grid gap-2">
        <Input rotulo="Título principal" value={campos.titulo ?? ''} onChange={(e) => atualizar('titulo', e.target.value)} />
        <Input rotulo="Subtítulo" value={campos.subtitulo ?? ''} onChange={(e) => atualizar('subtitulo', e.target.value)} />
        <Input rotulo="Texto do botão (CTA)" value={campos.cta ?? ''} onChange={(e) => atualizar('cta', e.target.value)} />
      </div>
    )
  }

  if (slugNorm === 'servicos') {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Itens de serviço (um por linha)</span>
        <textarea
          value={campos.itens ?? ''}
          onChange={(e) => atualizar('itens', e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={5}
        />
      </label>
    )
  }

  if (slugNorm === 'sobre') {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">Texto sobre a empresa</span>
        <textarea
          value={campos.texto ?? ''}
          onChange={(e) => atualizar('texto', e.target.value)}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={5}
        />
      </label>
    )
  }

  if (slugNorm === 'contato') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Input rotulo="WhatsApp (com DDI)" value={campos.whatsapp ?? ''} onChange={(e) => atualizar('whatsapp', e.target.value)} />
        <Input rotulo="E-mail" type="email" value={campos.email ?? ''} onChange={(e) => atualizar('email', e.target.value)} />
        <Input rotulo="Endereço" className="sm:col-span-2" value={campos.endereco ?? ''} onChange={(e) => atualizar('endereco', e.target.value)} />
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.keys(campos).map((chave) => (
        <Input
          key={chave}
          rotulo={chave}
          value={campos[chave] ?? ''}
          onChange={(e) => atualizar(chave, e.target.value)}
        />
      ))}
    </div>
  )
}

export function ModalSecao({ aberto, secao, onFechar, onSalvo }: Props) {
  const [titulo, setTitulo] = useState('')
  const [publicado, setPublicado] = useState(false)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto || !secao) return
    setTitulo(secao.titulo)
    setPublicado(secao.publicado)
    setCampos(carregarCampos(secao.slug, secao.conteudo))
    setErro('')
  }, [secao, aberto])

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase || !secao) throw new Error('Seção inválida')
      const novoConteudo = montarConteudo(secao.slug, campos)
      const { data, error } = await supabase
        .from('SecaoLanding')
        .update({ titulo, publicado, conteudo: novoConteudo })
        .eq('id', secao.id)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('Sem permissão para salvar ou seção não encontrada.')
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const nomeSecao = secao ? (NOMES_SECAO[secao.slug] ?? NOMES_SECAO[normalizarSlug(secao.slug)] ?? secao.titulo) : ''
  const atualizar = (chave: string, valor: string) => setCampos((c) => ({ ...c, [chave]: valor }))

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={`Editar seção: ${nomeSecao}`} largura="lg">
      {!secao ? (
        <p className="text-sm text-[var(--texto-muted)]">Seção não selecionada.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
          <Checkbox rotulo="Publicado" checked={publicado} onChange={setPublicado} />
          <Input rotulo="Título admin" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <CamposSecao slug={secao.slug} campos={campos} atualizar={atualizar} />
          {erro && <p className="text-sm text-erro">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
            <Botao type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando...' : 'Salvar seção'}
            </Botao>
          </div>
        </form>
      )}
    </Modal>
  )
}

export { NOMES_SECAO, normalizarSlug, parseConteudo }
