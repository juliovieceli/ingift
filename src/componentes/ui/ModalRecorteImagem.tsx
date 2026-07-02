import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { criarImagem, recortarLogoParaBlob, recortarParaBlob } from '@/lib/recorteImagem'
import { enviarImagemCms } from '@/lib/storageImagem'

export type PresetRecorte = 'portfolio' | 'logo'

interface Props {
  aberto: boolean
  imagemSrc: string
  preset: PresetRecorte
  onFechar: () => void
  onConfirmado: (urlPublica: string) => void
}

const PRESETS = {
  portfolio: { aspect: 1, rotulo: 'Portfólio (quadrado 1:1)' },
  logo: { aspect: undefined, rotulo: 'Logo (proporção livre)' },
} as const

export function ModalRecorteImagem({ aberto, imagemSrc, preset, onFechar, onConfirmado }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setArea(croppedAreaPixels)
  }, [])

  const confirmar = async () => {
    if (!area) return
    setProcessando(true)
    setErro('')
    try {
      const img = await criarImagem(imagemSrc)
      const blob =
        preset === 'portfolio'
          ? await recortarParaBlob(img, area, 1024, 1024)
          : await recortarLogoParaBlob(img, area, 256)
      const pasta = preset === 'portfolio' ? 'portfolio' : 'marca'
      const url = await enviarImagemCms(pasta, blob)
      onConfirmado(url)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar imagem')
    } finally {
      setProcessando(false)
    }
  }

  const cfg = PRESETS[preset]

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={`Recortar imagem — ${cfg.rotulo}`} largura="xl">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="relative h-72 overflow-hidden rounded-lg bg-[var(--superficie-elevada)] sm:h-80">
            <Cropper
              image={imagemSrc}
              crop={crop}
              zoom={zoom}
              aspect={cfg.aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {preset === 'logo' && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[var(--borda)] bg-[var(--superficie-elevada)] p-4">
              <p className="text-xs font-medium text-[var(--texto-muted)]">Pré-visualização</p>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-1.5">
                  <img src={imagemSrc} alt="" className="block h-auto w-auto max-w-[120px] object-contain" />
                  <span className="text-sm font-bold text-[var(--texto)]">Header</span>
                </div>
                <img src={imagemSrc} alt="" className="block h-auto w-auto max-w-[160px] object-contain" />
                <span className="text-xs text-[var(--texto-muted)]">Hero</span>
              </div>
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
            className="w-full"
          />
        </label>

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar} disabled={processando}>
            Cancelar
          </Botao>
          <Botao type="button" onClick={confirmar} disabled={processando || !area}>
            {processando ? 'Enviando...' : 'Confirmar'}
          </Botao>
        </div>
      </div>
    </Modal>
  )
}
