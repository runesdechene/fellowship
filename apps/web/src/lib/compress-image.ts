/**
 * Compress and resize an image file to WebP format.
 * Target: max 800px wide, WebP quality 80%, ~80-150 KB output.
 * Falls back to original file if compression produces a blank/corrupt result.
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      // Sanity check: image must have real dimensions
      if (!img.naturalWidth || !img.naturalHeight) {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }

      // Calculate new dimensions
      let { naturalWidth: width, naturalHeight: height } = img
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
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      // Verify canvas isn't blank — sample pixels across the image
      const checks = [
        [Math.floor(width / 4), Math.floor(height / 4)],
        [Math.floor(width / 2), Math.floor(height / 2)],
        [Math.floor(width * 3 / 4), Math.floor(height * 3 / 4)],
      ]
      const allBlank = checks.every(([x, y]) => {
        const px = ctx.getImageData(x, y, 1, 1).data
        return px[0] === 0 && px[1] === 0 && px[2] === 0 && px[3] === 0
      })
      if (allBlank) {
        console.warn('compressImage: canvas is blank after drawImage, using original file')
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }

      // Export as WebP (fall back to PNG if browser doesn't support WebP export)
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(objectUrl)
          if (!blob || blob.size < 1024) {
            // Blob too small = likely corrupt
            console.warn('compressImage: blob too small, using original file')
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

    img.onerror = () => {
      console.warn('compressImage: failed to load image, using original file')
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}
