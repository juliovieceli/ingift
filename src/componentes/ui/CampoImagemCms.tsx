import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Botao } from '@/componentes/ui/Botao'
import { ModalRecorteImagem, type PresetRecorte } from '@/componentes/ui/ModalRecorteImagem'
import { extrairCaminhoStorage, removerImagemCms } from '@/lib/storageImagem'

const TAMANHO_MAX = 5 * 1024 * 1024
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  valor: string
  onChange: (url: string) => void
  preset: PresetRecorte
  rotulo?: string
  obrigatorio?: boolean
}

export function CampoImagemCms({ valor, onChange, preset, rotulo = 'Imagem', obrigatorio }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [recorteAberto, setRecorteAberto] = useState(false)
  const [imagemLocal, setImagemLocal] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const urlAnteriorRef = useRef(valor)

  const abrirSeletor = () => inputRef.current?.click()

  const aoSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return

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
    const antiga = urlAnteriorRef.current
    if (antiga && antiga !== urlNova && extrairCaminhoStorage(antiga)) {
      await removerImagemCms(antiga)
    }
    urlAnteriorRef.current = urlNova
    onChange(urlNova)
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

  const remover = async () => {
    if (valor && extrairCaminhoStorage(valor)) {
      await removerImagemCms(valor)
    }
    urlAnteriorRef.current = ''
    onChange('')
  }

  const previewClass =
    preset === 'portfolio'
      ? 'aspect-square w-full max-w-xs object-cover'
      : 'mx-auto h-16 w-auto max-w-[200px] object-contain'

  return (
    <div className="space-y-2">
      <span className="text-sm text-[var(--texto-secundario)]">
        {rotulo}
        {obrigatorio && <span className="text-erro"> *</span>}
      </span>

      {valor ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-[var(--borda)] bg-[var(--superficie-elevada)] p-2">
            <img src={valor} alt="Preview" className={previewClass} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao type="button" variante="fantasma" onClick={abrirSeletor}>
              <ImagePlus className="h-4 w-4" />
              Trocar imagem
            </Botao>
            <Botao type="button" variante="fantasma" onClick={remover}>
              <Trash2 className="h-4 w-4" />
              Remover
            </Botao>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrirSeletor}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--borda)] bg-[var(--superficie-elevada)] px-4 py-8 text-[var(--texto-muted)] transition hover:border-secondary-500 hover:text-[var(--texto-secundario)]"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm">Selecionar imagem</span>
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
