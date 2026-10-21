/**
 * QUOI     — la photo et la bannière choisies pendant l'arrivée, en attendant la création.
 * POURQUOI — spec du 21/10/2026 : elles s'affichent tout de suite dans la vitrine en direct, et ne
 *            partent qu'à « Créer ma vitrine », quand l'enseigne existe.
 * ATTENTION — un fichier ne se garde pas en mémoire de session : un rechargement les perd (accepté).
 */
import { useCallback, useEffect, useState } from 'react'
import { prepareImage, type ImageKind, type PendingImage } from '@/lib/entity-images'

export interface ChosenImage extends PendingImage {
  name: string
}

type ByKind<T> = Record<ImageKind, T>

export function useWelcomeImages() {
  const [images, setImages] = useState<ByKind<ChosenImage | null>>({ avatar: null, cover: null })
  const [problems, setProblems] = useState<ByKind<string | null>>({ avatar: null, cover: null })

  // Une adresse locale d'aperçu se rend au navigateur dès qu'elle ne sert plus.
  useEffect(() => {
    const { avatar, cover } = images
    return () => {
      if (avatar) URL.revokeObjectURL(avatar.preview)
      if (cover) URL.revokeObjectURL(cover.preview)
    }
  }, [images])

  const pick = useCallback(async (kind: ImageKind, file: File) => {
    const image = await prepareImage(kind, file)
    const refused = typeof image === 'string' ? image : null
    setProblems((current) => ({ ...current, [kind]: refused }))
    if (typeof image !== 'string') {
      setImages((current) => ({ ...current, [kind]: { ...image, name: file.name } }))
    }
  }, [])

  return { images, problems, pick }
}
