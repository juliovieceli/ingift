import { parseConteudoHero } from './conteudoHero'
import { parseConteudoMarca } from './conteudoMarca'
import { parseConteudoServicos } from './conteudoServicos'
import { useLandingDados } from './useLandingDados'
import { linkWhatsapp } from './contatoLanding'
import { SecaoHero } from './SecaoHero'
import { SecaoServicos } from './SecaoServicos'
import { SecaoPortfolio } from './SecaoPortfolio'
import { SecaoSobre } from './SecaoSobre'
import { SecaoContato } from './SecaoContato'

export function PaginaInicial() {
  const { secao, portfolio, contato } = useLandingDados()
  const hero = parseConteudoHero(secao('hero')?.conteudo)
  const marca = parseConteudoMarca(secao('marca')?.conteudo)
  const servicosItens = parseConteudoServicos(secao('servicos')?.conteudo)
  const sobre = secao('sobre')?.conteudo as { texto?: string } | undefined
  const portfolioSecao = secao('portfolio')?.conteudo as { subtitulo?: string } | undefined
  const dadosContato = contato()

  const whatsapp = linkWhatsapp(dadosContato?.whatsapp) ?? 'https://wa.me/5511999999999'
  const temRedes = Boolean(
    dadosContato?.instagram?.trim() ||
    dadosContato?.tiktok?.trim() ||
    dadosContato?.youtube?.trim() ||
    dadosContato?.shopee?.trim()
  )

  return (
    <>
      <SecaoHero hero={hero} marca={marca} whatsapp={whatsapp} />
      <SecaoServicos
        titulo={secao('servicos')?.titulo ?? 'Serviços'}
        itens={servicosItens}
      />
      <SecaoPortfolio
        titulo={secao('portfolio')?.titulo ?? 'Portfólio'}
        subtitulo={portfolioSecao?.subtitulo}
        itens={portfolio.data ?? []}
      />
      <SecaoSobre
        titulo={secao('sobre')?.titulo ?? 'Sobre a InGift'}
        texto={sobre?.texto ?? 'A InGift transforma ideias em objetos com impressão 3D de qualidade.'}
      />
      <SecaoContato whatsapp={whatsapp} contato={dadosContato} temRedes={temRedes} />
    </>
  )
}
