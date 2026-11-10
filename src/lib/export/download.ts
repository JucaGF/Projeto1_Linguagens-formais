/** Único módulo de `src/lib` que toca o DOM: só roda no navegador. */

export function downloadFile(name: string, content: string | Blob, mime: string): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // o Safari cancela o download se a URL for revogada no mesmo tick do clique
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível ler o SVG'))
    image.src = url
  })
}

export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(image.naturalWidth * scale)
    canvas.height = Math.ceil(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível')
    // o tamanho arredondado para cima deixaria uma borda transparente fora do fundo do SVG
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar o PNG'))),
        'image/png',
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
