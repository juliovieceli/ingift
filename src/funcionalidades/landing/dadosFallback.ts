import type { PortfolioItem, SecaoLanding } from '@/tipos/database'

const agora = new Date().toISOString()

export const secoesFallback: SecaoLanding[] = [
  {
    id: '1',
    slug: 'hero',
    titulo: 'Hero',
    conteudo: {
      titulo: 'Impressão 3D sob medida',
      subtitulo: 'Transformamos suas ideias em objetos reais com qualidade e precisão',
      cta: 'Solicitar orçamento',
    },
    publicado: true,
    ordem: 1,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '2',
    slug: 'servicos',
    titulo: 'Serviços',
    conteudo: {
      itens: ['Prototipagem', 'Peças funcionais', 'Brindes personalizados', 'Peças sob medida'],
    },
    publicado: true,
    ordem: 2,
    atualizadoEm: agora,
    atualizadoPor: null,
  },
  {
    id: '3',
    slug: 'sobre',
    titulo: 'Sobre',
    conteudo: {
      texto: 'A InGift transforma ideias em objetos com impressão 3D de qualidade.',
    },
    publicado: true,
    ordem: 3,
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
    },
    publicado: true,
    ordem: 4,
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
