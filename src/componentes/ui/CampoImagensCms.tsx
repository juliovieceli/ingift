import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Botao } from '@/componentes/ui/Botao'
import { ModalRecorteImagem, type PresetRecorte } from '@/componentes/ui/ModalRecorteImagem'
import { extrairCaminhoStorage, removerImagemCms } from '@/lib/storageImagem'

const TAMANHO_MAX = 5 * 1024 * 1024
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGENS = 4

interface Props {
  valor: string[]
  onChange: (urls: string[]) => void
  preset: PresetRecorte
  rotulo?: string
  obrigatorio?: boolean
}

export function CampoImagensCms({ valor, onChange, preset, rotulo = 'Imagens', obrigatorio }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [recorteAberto, setRecorteAberto] = useState(false)
  const [imagemLocal, setImagemLocal] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const abrirSeletor = () => inputRef.current?.click()

  const aoSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return

    if (valor.length >= MAX_IMAGENS) {
      setErro(`Máximo de ${MAX_IMAGENS} imagens.`)
      return
    }

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato inválido. Use JPEG, PNG ou WebP.')
      return
    }
    if (arquivo.size > TAMANHO_MAX) {
      setErro('Arquivo muito grande. Máximo 5 MB.')
      return
    }

    setErro('')
    const url = URL.createObjectURL(arquivo)
    setImagemLocal(url)
    setRecorteAberto(true)
  }

  const aoConfirmarRecorte = async (urlNova: string) => {
    onChange([...valor, urlNova])
    if (imagemLocal) URL.revokeObjectURL(imagemLocal)
    setImagemLocal(null)
  }

  const aoFecharRecorte = () => {
    setRecorteAberto(false)
    if (imagemLocal) {
      URL.revokeObjectURL(imagemLocal)
      setImagemLocal(null)
    }
  }

  const remover = async (indice: number) => {
    const url = valor[indice]
    if (url && extrairCaminhoStorage(url)) {
      await removerImagemCms(url)
    }
    onChange(valor.filter((_, i) => i !== indice))
  }

  const previewClass =
    preset === 'portfolio'
      ? 'aspect-square w-full object-cover'
      : 'mx-auto h-16 w-auto max-w-[200px] object-contain'

  const podeAdicionar = valor.length < MAX_IMAGENS

  return (
    <div className="space-y-2">
      <span className="text-sm text-[var(--texto-secundario)]">
        {rotulo}
        {obrigatorio && <span className="text-erro"> *</span>}
        <span className="ml-1 text-xs text-[var(--texto-muted)]">
          ({valor.length}/{MAX_IMAGENS})
        </span>
      </span>

      {valor.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {valor.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="overflow-hidden rounded-lg border border-[var(--borda)] bg-[var(--superficie-elevada)] p-1.5"
            >
              <img src={url} alt={`Imagem ${i + 1}`} className={previewClass} />
              <Botao
                type="button"
                variante="fantasma"
                className="mt-1 w-full px-2 py-1 text-xs text-erro hover:bg-erro/10"
                onClick={() => remover(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </Botao>
            </div>
          ))}
        </div>
      )}

      {podeAdicionar && (
        <button
          type="button"
          onClick={abrirSeletor}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--borda)] bg-[var(--superficie-elevada)] px-4 py-6 text-[var(--texto-muted)] transition hover:border-secondary-500 hover:text-[var(--texto-secundario)]"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm">
            {valor.length === 0 ? 'Selecionar imagem' : 'Adicionar imagem'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        className="hidden"
        onChange={aoSelecionarArquivo}
      />

      {erro && <p className="text-sm text-erro">{erro}</p>}

      {imagemLocal && (
        <ModalRecorteImagem
          aberto={recorteAberto}
          imagemSrc={imagemLocal}
          preset={preset}
          onFechar={aoFecharRecorte}
          onConfirmado={aoConfirmarRecorte}
        />
      )}
    </div>
  )
}

/** Remove do storage todas as URLs CMS de um array. */
export async function removerImagensCms(urls: string[]): Promise<void> {
  await Promise.all(
    urls.filter((u) => extrairCaminhoStorage(u)).map((u) => removerImagemCms(u)),
  )
}
