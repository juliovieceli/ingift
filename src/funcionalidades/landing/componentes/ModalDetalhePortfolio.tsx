import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'

interface Props {
  aberto: boolean
  titulo: string
  descricao: string
  urlImagem: string
  grupo: string | null
  urlLoja: string | null
  onFechar: () => void
}

export function ModalDetalhePortfolio({
  aberto,
  titulo,
  descricao,
  urlImagem,
  grupo,
  urlLoja,
  onFechar,
}: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo} largura="xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="mx-auto w-full shrink-0 sm:mx-0 sm:w-56 md:w-64">
          <img
            src={urlImagem}
            alt={titulo}
            className="aspect-square w-full rounded-lg border border-[var(--borda)] object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {grupo && (
            <span className="w-fit rounded-full bg-[var(--superficie-elevada)] px-2.5 py-0.5 text-xs font-medium text-[var(--texto-secundario)]">
              {grupo}
            </span>
          )}
          <p className="whitespace-pre-wrap text-[var(--texto-secundario)]">{descricao}</p>
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
