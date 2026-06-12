import { IconeShopee, IconeTikTok, Instagram, Youtube } from './IconesRedesSociais'
import { listarRedesSociais, normalizarUrl, type ContatoLanding } from './contatoLanding'

const estiloIconeClaro =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white hover:bg-white/10'

const estiloIconeNeutro =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--borda)] text-[var(--texto-muted)] transition hover:border-secondary-400 hover:text-secondary-500'

const icones = {
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <IconeTikTok className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  shopee: <IconeShopee className="h-4 w-4" />,
}

type Props = {
  contato?: ContatoLanding
  variante?: 'claro' | 'neutro'
  className?: string
}

export function LinksRedesSociais({ contato, variante = 'neutro', className = '' }: Props) {
  const redes = listarRedesSociais(contato)
  if (!redes.length) return null

  const estilo = variante === 'claro' ? estiloIconeClaro : estiloIconeNeutro

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {redes.map((rede) => (
        <a
          key={rede.id}
          href={normalizarUrl(rede.url)}
          target="_blank"
          rel="noreferrer"
          aria-label={rede.rotulo}
          className={estilo}
        >
          {icones[rede.id as keyof typeof icones]}
        </a>
      ))}
    </div>
  )
}
