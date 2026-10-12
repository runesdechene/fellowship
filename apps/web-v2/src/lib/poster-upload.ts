/**
 * QUOI     — l'envoi de l'affiche d'un événement : réduite dans le navigateur, puis rangée dans le
 *            stockage ; rend son adresse publique.
 * POURQUOI — la création (10b) et la modification (10c) envoient une affiche de la même façon ;
 *            une photo de téléphone de 10 Mo devient quelques centaines de Ko.
 * ATTENTION — lève une erreur au message lisible : à l'appelant de le dire, sans rien envoyer.
 */
import { imageProblem, resizeImage } from '@/lib/image-resize'
import { supabase } from '@/lib/supabase'

const POSTER_BUCKET = 'event-images'
/** Assez pour le mur d'affiche de la fiche, en grand écran. */
const POSTER_WIDTH = 1200

export class PosterError extends Error {
  readonly reason: 'unusable' | 'upload'

  constructor(reason: 'unusable' | 'upload') {
    super(
      reason === 'unusable'
        ? 'Cette affiche ne peut pas être utilisée. Choisis-en une autre.'
        : 'L’affiche n’a pas pu être envoyée. Réessaie.',
    )
    this.reason = reason
  }
}

export async function uploadPoster(file: File): Promise<string> {
  const blob = imageProblem(file) ? null : await resizeImage(file, POSTER_WIDTH).catch(() => null)
  if (!blob) throw new PosterError('unusable')
  const path = `${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage
    .from(POSTER_BUCKET)
    .upload(path, blob, { contentType: blob.type })
  if (error) throw new PosterError('upload')
  return supabase.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl
}
