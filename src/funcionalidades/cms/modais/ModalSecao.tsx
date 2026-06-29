import { Botao } from '@/componentes/ui/Botao'
import { CampoImagemCms } from '@/componentes/ui/CampoImagemCms'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { extrairCaminhoStorage, removerImagemCms } from '@/lib/storageImagem'
import { CamposContatoCms } from '@/funcionalidades/cms/CamposContatoCms'
import { carregarCamposContato, montarConteudoContato } from '@/funcionalidades/cms/contatoCms'
import { normalizarSlug, nomeSecaoCms } from '@/funcionalidades/cms/secaoCms'
import { FRASES_ROTATIVAS_PADRAO, HERO_PADRAO } from '@/funcionalidades/landing/conteudoHero'
import { MARCA_PADRAO } from '@/funcionalidades/landing/conteudoMarca'
import {
  parseConteudoServicos,
  parseTextoItensServico,
  serializarItensServico,
  SERVICOS_PADRAO,
} from '@/funcionalidades/landing/conteudoServicos'
import { parseConteudo } from '@/lib/parseConteudo'
import { selecionarTextoAoFocar } from '@/lib/selecionarAoFocar'
import { supabase } from '@/lib/supabase'
import type { SecaoLanding } from '@/tipos/database'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'

interface Props {
  aberto: boolean
  secao: SecaoLanding | null
  onFechar: () => void
  onSalvo: () => void
}

const DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    titulo: HERO_PADRAO.titulo,
    frasesRotativas: FRASES_ROTATIVAS_PADRAO,
    subtitulo: HERO_PADRAO.subtitulo,
    cta: HERO_PADRAO.cta,
    ctaSecundario: HERO_PADRAO.ctaSecundario,
  },
  marca: {
    urlLogo: MARCA_PADRAO.urlLogo,
    nomeMarca: MARCA_PADRAO.nomeMarca,
    exibirLogoHero: MARCA_PADRAO.exibirLogoHero,
  },
  servicos: {
    itens: SERVICOS_PADRAO,
  },
  portfolio: {
    subtitulo: 'Alguns dos nossos trabalhos em impressão 3D',
  },
  sobre: {
    texto: 'A InGift transforma ideias em objetos com impressão 3D de qualidade.',
  },
  contato: {
    whatsapp: '5511999999999',
    email: '',
    endereco: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    shopee: '',
  },
}

function carregarCampos(slug: string, conteudoRaw: unknown) {
  const slugNorm = normalizarSlug(slug)
  const conteudo = parseConteudo(conteudoRaw)
  const base = { ...(DEFAULTS[slugNorm] ?? {}), ...conteudo }

  if (slugNorm === 'hero') {
    const frases = Array.isArray(base.frasesRotativas) ? (base.frasesRotativas as string[]) : FRASES_ROTATIVAS_PADRAO
    return {
      titulo: String(base.titulo ?? ''),
      frasesRotativas: frases.join('\n'),
      subtitulo: String(base.subtitulo ?? ''),
      cta: String(base.cta ?? ''),
      ctaSecundario: String(base.ctaSecundario ?? ''),
    }
  }
  if (slugNorm === 'marca') {
    return {
      urlLogo: String(base.urlLogo ?? MARCA_PADRAO.urlLogo),
      nomeMarca: String(base.nomeMarca ?? MARCA_PADRAO.nomeMarca),
      exibirLogoHero: base.exibirLogoHero === true ? 'true' : 'false',
    }
  }
  if (slugNorm === 'servicos') {
    const itens = parseConteudoServicos({ itens: base.itens })
    return { itens: serializarItensServico(itens) }
  }
  if (slugNorm === 'portfolio') {
    return { subtitulo: String(base.subtitulo ?? '') }
  }
  if (slugNorm === 'sobre') {
    return { texto: String(base.texto ?? '') }
  }
  if (slugNorm === 'contato') {
    return carregarCamposContato(conteudoRaw)
  }
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v ?? '')]))
}

function montarConteudo(slug: string, campos: Record<string, string>): Record<string, unknown> {
  const slugNorm = normalizarSlug(slug)
  if (slugNorm === 'hero') {
    const frases = (campos.frasesRotativas ?? '')
      .split(/[\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    return {
      titulo: campos.titulo ?? '',
      frasesRotativas: frases,
      subtitulo: campos.subtitulo ?? '',
      cta: campos.cta ?? '',
      ctaSecundario: campos.ctaSecundario ?? '',
    }
  }
  if (slugNorm === 'marca') {
    return {
      urlLogo: campos.urlLogo ?? MARCA_PADRAO.urlLogo,
      nomeMarca: campos.nomeMarca ?? MARCA_PADRAO.nomeMarca,
      exibirLogoHero: campos.exibirLogoHero === 'true',
    }
  }
  if (slugNorm === 'servicos') {
    return { itens: parseTextoItensServico(campos.itens ?? '') }
  }
  if (slugNorm === 'portfolio') {
    return { subtitulo: campos.subtitulo ?? '' }
  }
  if (slugNorm === 'sobre') {
    return { texto: campos.texto ?? '' }
  }
  if (slugNorm === 'contato') {
    return montarConteudoContato(campos)
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
        <Input rotulo="Título fixo (h1)" value={campos.titulo ?? ''} onChange={(e) => atualizar('titulo', e.target.value)} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">
            Frases rotativas (uma por linha — alternam no título)
          </span>
          <textarea
            value={campos.frasesRotativas ?? ''}
            onChange={(e) => atualizar('frasesRotativas', e.target.value)}
            onFocus={selecionarTextoAoFocar}
            className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
            rows={5}
            placeholder={'para sua empresa\npara presentes de Natal\npara o Dia das Mães\npara brindes corporativos'}
          />
          <span className="text-xs text-[var(--texto-muted)]">
            Aparecem após o título fixo, alternando a cada poucos segundos. Ideal para campanhas e datas comemorativas — basta editar e salvar.
          </span>
        </label>
        <Input rotulo="Subtítulo" value={campos.subtitulo ?? ''} onChange={(e) => atualizar('subtitulo', e.target.value)} />
        <Input rotulo="Texto do botão (CTA)" value={campos.cta ?? ''} onChange={(e) => atualizar('cta', e.target.value)} />
        <Input rotulo="Texto link secundário" value={campos.ctaSecundario ?? ''} onChange={(e) => atualizar('ctaSecundario', e.target.value)} />
      </div>
    )
  }

  if (slugNorm === 'marca') {
    return (
      <div className="grid gap-3">
        <CampoImagemCms
          valor={campos.urlLogo ?? ''}
          onChange={(v) => atualizar('urlLogo', v)}
          preset="logo"
          rotulo="Logo"
          obrigatorio
        />
        <Input rotulo="Nome da marca" value={campos.nomeMarca ?? ''} onChange={(e) => atualizar('nomeMarca', e.target.value)} />
        <Checkbox
          rotulo="Exibir logo também no centro do hero"
          checked={campos.exibirLogoHero === 'true'}
          onChange={(v) => atualizar('exibirLogoHero', v ? 'true' : 'false')}
        />
        <p className="text-xs text-[var(--texto-muted)]">
          Por padrão a logo aparece só no topo. Ative se quiser reforçar a marca no centro da página.
        </p>
      </div>
    )
  }

  if (slugNorm === 'portfolio') {
    return (
      <Input rotulo="Subtítulo da seção" value={campos.subtitulo ?? ''} onChange={(e) => atualizar('subtitulo', e.target.value)} />
    )
  }

  if (slugNorm === 'servicos') {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--texto-secundario)]">
          Serviços (um por linha: Título | Descrição curta)
        </span>
        <textarea
          value={campos.itens ?? ''}
          onChange={(e) => atualizar('itens', e.target.value)}
          onFocus={selecionarTextoAoFocar}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={6}
          placeholder={'Prototipagem | Valide conceitos rapidamente...\nPeças funcionais | Componentes resistentes...'}
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
          onFocus={selecionarTextoAoFocar}
          className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
          rows={5}
        />
      </label>
    )
  }

  if (slugNorm === 'contato') {
    return <CamposContatoCms campos={campos} atualizar={atualizar} />
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

function FormularioSecao({
  secao,
  onFechar,
  onSalvo,
}: {
  secao: SecaoLanding
  onFechar: () => void
  onSalvo: () => void
}) {
  const [titulo, setTitulo] = useState(secao.titulo)
  const [publicado, setPublicado] = useState(secao.publicado)
  const [campos, setCampos] = useState(() => carregarCampos(secao.slug, secao.conteudo))
  const [erro, setErro] = useState('')
  const urlLogoInicial = useRef(
    normalizarSlug(secao.slug) === 'marca'
      ? String(carregarCampos(secao.slug, secao.conteudo).urlLogo ?? '')
      : '',
  )

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      if (normalizarSlug(secao.slug) === 'marca' && !campos.urlLogo) {
        throw new Error('Selecione uma logo')
      }
      const novoConteudo = montarConteudo(secao.slug, campos)
      const { data, error } = await supabase
        .from('SecaoLanding')
        .update({ titulo, publicado, conteudo: novoConteudo })
        .eq('id', secao.id)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('Sem permissão para salvar ou seção não encontrada.')

      if (
        normalizarSlug(secao.slug) === 'marca' &&
        urlLogoInicial.current &&
        campos.urlLogo !== urlLogoInicial.current &&
        extrairCaminhoStorage(urlLogoInicial.current)
      ) {
        await removerImagemCms(urlLogoInicial.current)
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const atualizar = (chave: string, valor: string) => setCampos((c) => ({ ...c, [chave]: valor }))

  return (
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
  )
}

export function ModalSecao({ aberto, secao, onFechar, onSalvo }: Props) {
  const nomeSecao = secao ? nomeSecaoCms(secao.slug, secao.titulo) : ''

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={`Editar seção: ${nomeSecao}`} largura="lg">
      {!secao ? (
        <p className="text-sm text-[var(--texto-muted)]">Seção não selecionada.</p>
      ) : (
        aberto && (
          <FormularioSecao
            key={secao.id}
            secao={secao}
            onFechar={onFechar}
            onSalvo={onSalvo}
          />
        )
      )}
    </Modal>
  )
}
