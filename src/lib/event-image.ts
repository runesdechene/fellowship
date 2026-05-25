import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/compress-image'

/**
 * Compress an image file and upload it to the event-images bucket.
 * Returns the public URL of the uploaded image.
 * Throws on upload failure.
 */
export async function uploadEventImage(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const isWebp = compressed.type === 'image/webp'
  const ext = isWebp ? 'webp' : (compressed.name.split('.').pop() ?? 'jpg')
  const path = `${crypto.randomUUID()}.${ext}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('event-images')
    .upload(path, compressed, { contentType: compressed.type || 'image/webp' })
  if (uploadError || !uploadData) {
    throw new Error(uploadError?.message ?? 'Upload failed')
  }
  const { data: urlData } = supabase.storage
    .from('event-images')
    .getPublicUrl(uploadData.path)
  return urlData.publicUrl
}
