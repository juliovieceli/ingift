import type { Area } from 'react-easy-crop'

export function criarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () => reject(new Error('Não foi possível carregar a imagem')))
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

function canvasParaBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem'))),
      tipo,
      qualidade,
    )
  })
}

export async function recortarParaBlob(
  imagem: HTMLImageElement,
  area: Area,
  larguraSaida: number,
  alturaSaida: number,
  tipo: 'image/webp' | 'image/jpeg' = 'image/webp',
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = larguraSaida
  canvas.height = alturaSaida
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado')

  ctx.drawImage(
    imagem,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    larguraSaida,
    alturaSaida,
  )

  return canvasParaBlob(canvas, tipo, 0.9)
}

/** Redimensiona mantendo proporção com altura máxima (logo). */
export async function recortarLogoParaBlob(
  imagem: HTMLImageElement,
  area: Area,
  alturaMax: number,
  tipo: 'image/webp' | 'image/jpeg' = 'image/webp',
): Promise<Blob> {
  const proporcao = area.width / area.height
  const alturaSaida = Math.min(alturaMax, area.height)
  const larguraSaida = Math.round(alturaSaida * proporcao)
  return recortarParaBlob(imagem, area, larguraSaida, alturaSaida, tipo)
}
