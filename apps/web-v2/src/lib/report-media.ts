/**
 * QUOI     — les photos souvenir d'un bilan : chemin, envoi compressé, adresses signées, retrait.
 * POURQUOI — le bucket bilan-media est PRIVÉ : on lit par URL signée, et la policy
 *            (bilan_media_*_own) n'ouvre un fichier qu'à l'acteur du premier dossier du chemin.
 * ATTENTION — la compression passe par le navigateur (createImageBitmap + canvas) : rien à tester
 *            ici hors du chemin.
 */
import { supabase } from './supabase'

const BUCKET = 'bilan-media'
const SIGNED_TTL = 3600
const MAX_SIDE = 1600

export function reportPhotoPath(actorId: string, eventId: string, id: string, ext: string): string {
  return `${actorId}/${eventId}/${id}.${ext}`
}

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('La photo n’a pas pu être compressée.'))
      },
      'image/webp',
      0.82,
    )
  })
}

export async function uploadReportPhoto(
  file: File,
  actorId: string,
  eventId: string,
): Promise<string> {
  const blob = await compress(file)
  const path = reportPhotoPath(actorId, eventId, crypto.randomUUID(), 'webp')
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  return path
}

export async function signedReportUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  if (error) throw error
  for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  return urls
}

export async function removeReportPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}
