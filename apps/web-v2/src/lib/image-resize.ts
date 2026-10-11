/**
 * QUOI     — réduire une image dans le navigateur avant de l'envoyer : la taille cible, le refus
 *            d'un fichier inutilisable, et la réduction elle-même (canevas, WebP, repli JPEG).
 * POURQUOI — lot 6b : une photo de téléphone de 10 Mo devient quelques centaines de Ko ; la
 *            vitrine reste rapide et le stockage léger.
 * ATTENTION — `resizeImage` passe par le canevas, absent de jsdom : seuls `fitWithin` et
 *            `imageProblem` sont testés ici, la réduction se vérifie dans le navigateur.
 */

const MAX_BYTES = 15_000_000

/** La taille dans une largeur maximale, proportions gardées ; une image n'est jamais agrandie. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max) return { width, height }
  return { width: max, height: Math.round((height * max) / width) }
}

export function imageProblem(file: File): string | null {
  if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
    return 'Cette image ne peut pas être utilisée.'
  }
  return null
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

/** L'image réduite à `maxWidth`, en WebP ; en JPEG si le navigateur ne sait pas faire de WebP. */
export async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const size = fitWithin(bitmap.width, bitmap.height, maxWidth)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()
  const webp = await toBlob(canvas, 'image/webp', 0.86)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.86)
  if (!jpeg) throw new Error('Image illisible')
  return jpeg
}
