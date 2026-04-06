/**
 * Compress and resize an image file to WebP format.
 * Target: max 800px wide, WebP quality 80%, ~80-150 KB output.
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      // Draw to canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file) // fallback to original
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      // Export as WebP
      canvas.toBlob(
        blob => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
          })
          resolve(compressed)
        },
        'image/webp',
        quality,
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
