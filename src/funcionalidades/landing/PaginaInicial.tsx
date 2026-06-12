import { Botao } from '@/componentes/ui/Botao'
import { useLandingDados } from './useLandingDados'
import { linkWhatsapp } from './contatoLanding'
import { LinksRedesSociais } from './LinksRedesSociais'

export function PaginaInicial() {
  const { secao, portfolio, contato } = useLandingDados()
  const hero = secao('hero')?.conteudo as { titulo?: string; subtitulo?: string; cta?: string } | undefined
  const servicos = secao('servicos')?.conteudo as { itens?: string[] } | undefined
  const sobre = secao('sobre')?.conteudo as { texto?: string } | undefined
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                {hero?.titulo ?? 'Impressão 3D sob medida'}
              </h1>
              <p className="mt-4 text-lg text-primary-200">
                {hero?.subtitulo ?? 'Transformamos suas ideias em objetos reais'}
              </p>
              <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-8 inline-block">
                <Botao variante="secundario">{hero?.cta ?? 'Solicitar orçamento'}</Botao>
              </a>
            </div>
            <img
              src="/imagens/portfolio-porta-lata.jpg"
              alt="Trabalho InGift"
              className="rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section id="servicos" className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-[var(--texto)]">Serviços</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(servicos?.itens ?? []).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-6 text-center transition hover:border-secondary-500"
              >
                <div className="mx-auto mb-3 h-2 w-8 rounded bg-secondary-500" />
                <p className="font-medium text-[var(--texto)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="bg-[var(--superficie)] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-[var(--texto)]">Portfólio</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(portfolio.data ?? []).map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-xl border border-[var(--borda)]">
                <img src={item.urlImagem} alt={item.titulo} className="aspect-square w-full object-cover" />
                <figcaption className="p-3">
                  <p className="font-medium text-[var(--texto)]">{item.titulo}</p>
                  {item.descricao && (
                    <p className="text-sm text-[var(--texto-muted)]">{item.descricao}</p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-[var(--texto)]">Sobre a InGift</h2>
          <p className="mt-6 text-lg text-[var(--texto-secundario)]">
            {sobre?.texto ?? 'A InGift transforma ideias em objetos com impressão 3D de qualidade.'}
          </p>
        </div>
      </section>

      <section id="contato" className="bg-primary-900 px-4 py-16 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-10 md:flex-row md:items-start md:gap-16">
          {temRedes && (
            <div className="flex max-w-xs flex-col items-center text-center md:flex-1">
              <h2 className="text-2xl font-bold">Siga-nos nas redes sociais</h2>
              <p className="mt-3 text-sm text-primary-200">
                Acompanhe nossos trabalhos e novidades.
              </p>
              <LinksRedesSociais contato={dadosContato} variante="claro" className="mt-6 justify-center" />
            </div>
          )}

          <div className="flex max-w-xs flex-col items-center text-center md:flex-1">
            <h2 className="text-2xl font-bold">Fale conosco</h2>
            <p className="mt-3 text-sm text-primary-200">
              Tire suas dúvidas ou solicite um orçamento pelo WhatsApp.
            </p>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-6 inline-block">
              <Botao variante="secundario">Chamar no WhatsApp</Botao>
            </a>
            {dadosContato?.email && <p className="mt-4 text-sm text-primary-300">{dadosContato.email}</p>}
            {dadosContato?.endereco && <p className="mt-2 text-sm text-primary-300">{dadosContato.endereco}</p>}
          </div>
        </div>
      </section>
    </>
  )
}
