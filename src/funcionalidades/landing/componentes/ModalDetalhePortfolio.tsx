import { useEffect, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'

interface Props {
  aberto: boolean
  titulo: string
  descricao?: string | null
  urlsImagem: string[]
  grupos: string[]
  urlLoja: string | null
  onFechar: () => void
}

export function ModalDetalhePortfolio({
  aberto,
  titulo,
  descricao,
  urlsImagem,
  grupos,
  urlLoja,
  onFechar,
}: Props) {
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const imagemPrincipal = urlsImagem[indiceAtivo] ?? urlsImagem[0]

  useEffect(() => {
    if (aberto) setIndiceAtivo(0)
  }, [aberto, titulo, urlsImagem])

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo} largura="xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="mx-auto w-full shrink-0 sm:mx-0 sm:w-72 md:w-80">
          {imagemPrincipal ? (
            <img
              src={imagemPrincipal}
              alt={titulo}
              className="aspect-square w-full rounded-lg border border-[var(--borda)] object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-elevada)] text-sm text-[var(--texto-muted)]">
              Sem imagem
            </div>
          )}
          {urlsImagem.length > 1 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {urlsImagem.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setIndiceAtivo(i)}
                  className={`overflow-hidden rounded-md border-2 transition ${
                    i === indiceAtivo
                      ? 'border-secondary-500'
                      : 'border-[var(--borda)] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={url}
                    alt={`${titulo} — miniatura ${i + 1}`}
                    className="h-14 w-14 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {grupos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {grupos.map((grupo) => (
                <span
                  key={grupo}
                  className="rounded-full bg-[var(--superficie-elevada)] px-2.5 py-0.5 text-xs font-medium text-[var(--texto-secundario)]"
                >
                  {grupo}
                </span>
              ))}
            </div>
          )}
          {descricao?.trim() ? (
            <p className="whitespace-pre-wrap text-[var(--texto-secundario)]">{descricao}</p>
          ) : (
            <p className="text-sm italic text-[var(--texto-muted)]">Sem descrição cadastrada.</p>
          )}
          {urlLoja && (
            <a href={urlLoja} target="_blank" rel="noreferrer" className="mt-1 inline-block self-start">
              <Botao type="button" variante="secundario">
                Quero esse
              </Botao>
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}
