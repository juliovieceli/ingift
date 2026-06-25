import type { PortfolioItem, SecaoLanding } from '@/tipos/database'
import { FRASES_ROTATIVAS_PADRAO, HERO_PADRAO } from './conteudoHero'
import { MARCA_PADRAO } from './conteudoMarca'
import { SERVICOS_PADRAO } from './conteudoServicos'

const agora = new Date().toISOString()

export const secoesFallback: SecaoLanding[] = [
  {
    id: '1',
    slug: 'hero',
    titulo: 'Hero',
    conteudo: {
      titulo: HERO_PADRAO.titulo,
      frasesRotativas: FRASES_ROTATIVAS_PADRAO,
      subtitulo: HERO_PADRAO.subtitulo,
      cta: HERO_PADRAO.cta,
      ctaSecundario: HERO_PADRAO.ctaSecundario,
    },
    publicado: true,
    ordem: 1,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '6',
    slug: 'marca',
    titulo: 'Marca / Logo',
    conteudo: {
      urlLogo: MARCA_PADRAO.urlLogo,
      nomeMarca: MARCA_PADRAO.nomeMarca,
      exibirLogoHero: MARCA_PADRAO.exibirLogoHero,
    },
    publicado: true,
    ordem: 0,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '2',
    slug: 'servicos',
    titulo: 'Serviços',
    conteudo: {
      itens: SERVICOS_PADRAO,
    },
    publicado: true,
    ordem: 2,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '5',
    slug: 'portfolio',
    titulo: 'Portfólio',
    conteudo: {
      subtitulo: 'Alguns dos nossos trabalhos em impressão 3D',
    },
    publicado: true,
    ordem: 3,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '3',
    slug: 'sobre',
    titulo: 'Sobre a InGift',
    conteudo: {
      texto: 'A InGift transforma ideias em objetos com impressão 3D de qualidade.',
    },
    publicado: true,
    ordem: 4,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '4',
    slug: 'contato',
    titulo: 'Contato',
    conteudo: {
      whatsapp: '5511999999999',
      email: '',
      endereco: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      shopee: '',
    },
    publicado: true,
    ordem: 5,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
]

export const portfolioFallback: PortfolioItem[] = [
  { id: '1', titulo: 'Porta-lata Monster', descricao: 'Peça personalizada', urlImagem: '/imagens/portfolio-porta-lata.jpg', publicado: true, ordem: 1, criadoEm: agora, atualizadoEm: agora, criadoPor: null, atualizadoPor: null },
  { id: '2', titulo: 'Produto 01', descricao: 'Impressão 3D', urlImagem: '/imagens/portfolio-01.jpg', publicado: true, ordem: 2, criadoEm: agora, atualizadoEm: agora, criadoPor: null, atualizadoPor: null },
  { id: '3', titulo: 'Produto 02', descricao: 'Prototipagem', urlImagem: '/imagens/portfolio-02.jpg', publicado: true, ordem: 3, criadoEm: agora, atualizadoEm: agora, criadoPor: null, atualizadoPor: null },
  { id: '4', titulo: 'Produto 03', descricao: 'Peça decorativa', urlImagem: '/imagens/portfolio-03.png', publicado: true, ordem: 4, criadoEm: agora, atualizadoEm: agora, criadoPor: null, atualizadoPor: null },
]
