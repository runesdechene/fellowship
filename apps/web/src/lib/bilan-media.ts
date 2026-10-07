// Plomberie Storage du bilan : bucket PRIVÉ `bilan-media`. Path = {actorId}/{eventId}/{uuid}.ext.
// Lecture par URL signée (bucket non public). Cf. spec 2026-06-02-bilan-enrichi-mes-bilans.
import { supabase } from './supabase'
import { compressImage } from './compress-image'

const BUCKET = 'bilan-media'
const SIGNED_TTL = 3600 // 1 h

/** Compresse (WebP ~800px) puis upload une photo de bilan. Retourne le path stocké. */
export async function uploadBilanPhoto(file: File, actorId: string, eventId: string): Promise<string> {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop() || 'webp'
  const path = `${actorId}/${eventId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    upsert: false,
    contentType: compressed.type,
  })
  if (error) throw error
  return path
}

/** URLs signées (TTL 1 h) pour des paths du bucket privé. Map path -> url. */
export async function signedUrlsFor(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
  }
  return map
}

/** Supprime une photo du bucket. */
export async function removeBilanPhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
