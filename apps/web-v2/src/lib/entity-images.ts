/**
 * QUOI     — la photo et la bannière d'une enseigne : les préparer (contrôle et réduction) et les
 *            envoyer dans le stockage.
 * POURQUOI — partagé par le mode édition de la vitrine (lot 6b) et l'arrivée (spec du 21/10/2026) :
 *            une seule façon de nommer, réduire et ranger les images d'une enseigne.
 * ATTENTION — la réduction passe par le canevas, absent de jsdom : rien ici ne se teste en unitaire,
 *            tout se vérifie dans le navigateur (`image-resize.ts` teste ce qui peut l'être).
 */
import { imageProblem, resizeImage } from './image-resize'
import { supabase } from './supabase'

export type ImageKind = 'cover' | 'avatar'

export interface PendingImage {
  /** Déjà réduite : c'est elle qui partira. */
  blob: Blob
  /** Une adresse locale : l'aperçu s'affiche sans rien envoyer. */
  preview: string
}

export const GALLERY = 'entity-gallery'

const UNREADABLE = 'Cette image ne peut pas être utilisée.'

const MAX_WIDTH: Record<ImageKind, number> = { cover: 2000, avatar: 512 }

/** L'image réduite, prête à partir, ou la raison de son refus. */
export async function prepareImage(kind: ImageKind, file: File): Promise<PendingImage | string> {
  const refused = imageProblem(file)
  if (refused) return refused
  try {
    const blob = await resizeImage(file, MAX_WIDTH[kind])
    return { blob, preview: URL.createObjectURL(blob) }
  } catch {
    return UNREADABLE // un SVG, une photo HEIC, un PDF renommé en .jpg
  }
}

/** Envoie une image ; rend son chemin (pour la retirer si l'enregistrement échoue) et son adresse. */
export async function uploadEntityImage(actorId: string, kind: ImageKind, image: PendingImage) {
  const extension = image.blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${actorId}/${kind}/${String(Date.now())}.${extension}`
  const { error } = await supabase.storage
    .from(GALLERY)
    .upload(path, image.blob, { contentType: image.blob.type })
  if (error) throw new Error(error.message)
  return { path, url: supabase.storage.from(GALLERY).getPublicUrl(path).data.publicUrl }
}
