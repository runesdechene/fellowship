/**
 * QUOI     — le mode édition d'une vitrine : le brouillon, les images en attente, ce qui a changé,
 *            et l'enregistrement (images envoyées, puis un seul `update`).
 * POURQUOI — lot 6b (spec du 11/10/2026) : on modifie en place et rien n'est publié avant
 *            « Enregistrer » ; « Annuler » ne laisse rien derrière lui, pas même une image envoyée.
 *            Une image se réduit dès qu'on la choisit : un fichier illisible est refusé tout de
 *            suite, pas à l'enregistrement. Un enregistrement refusé retire les images envoyées.
 * ATTENTION — l'écriture passe par `entities_update_member` (can_act_as) ; plan, Pro offert,
 *            Ambassadeur et Certifié sont protégés par déclencheur. Une adresse prise revient en
 *            `addressProblem`, jamais en échec silencieux.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { imageProblem, resizeImage } from '@/lib/image-resize'
import { supabase } from '@/lib/supabase'
import {
  changedColumns,
  cleanLinks,
  fieldProblem,
  isSlugTaken,
  slugProblem,
  type VitrineDraft,
} from '@/lib/vitrine-edit'
import type { Vitrine } from './useVitrine'

export interface PendingImage {
  /** Déjà réduite : c'est elle qui partira. */
  blob: Blob
  /** Une adresse locale : l'aperçu s'affiche sans rien envoyer. */
  preview: string
}

const UNREADABLE = 'Cette image ne peut pas être utilisée.'

type ImageKind = 'cover' | 'avatar'

const MAX_WIDTH: Record<ImageKind, number> = { cover: 2000, avatar: 512 }

function draftOf(vitrine: Vitrine): VitrineDraft {
  return {
    name: vitrine.name,
    craft: vitrine.craft ?? '',
    city: vitrine.city ?? '',
    department: vitrine.department ?? '',
    bio: vitrine.bio ?? '',
    links: vitrine.links,
    slug: vitrine.slug,
    bannerPosition: vitrine.bannerPosition,
  }
}

/** La vitrine telle qu'elle vient d'être publiée : affichée tout de suite, sans attendre la relecture. */
function published(vitrine: Vitrine, draft: VitrineDraft, images: Partial<Vitrine>): Vitrine {
  const text = (value: string) => value.trim() || null
  return {
    ...vitrine,
    name: draft.name.trim(),
    craft: text(draft.craft),
    city: text(draft.city),
    department: text(draft.department),
    bio: text(draft.bio),
    links: cleanLinks(draft.links),
    slug: draft.slug,
    bannerPosition: draft.bannerPosition,
    ...images,
  }
}

const GALLERY = 'entity-gallery'

/** Envoie une image ; rend son chemin (pour la retirer si l'enregistrement échoue) et son adresse. */
async function upload(actorId: string, kind: ImageKind, image: PendingImage) {
  const extension = image.blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${actorId}/${kind}/${String(Date.now())}.${extension}`
  const { error } = await supabase.storage
    .from(GALLERY)
    .upload(path, image.blob, { contentType: image.blob.type })
  if (error) throw new Error(error.message)
  return { path, url: supabase.storage.from(GALLERY).getPublicUrl(path).data.publicUrl }
}

export function useVitrineEdit(vitrine: Vitrine, onSaved: (next: Vitrine) => void) {
  const initial = useMemo(() => draftOf(vitrine), [vitrine])
  const [draft, setDraft] = useState(initial)
  const [banner, setBanner] = useState<PendingImage | null>(null)
  const [logo, setLogo] = useState<PendingImage | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [addressProblem, setAddressProblem] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  // Une adresse locale d'aperçu se rend au navigateur dès qu'elle ne sert plus.
  useEffect(() => {
    if (!banner) return
    return () => {
      URL.revokeObjectURL(banner.preview)
    }
  }, [banner])
  useEffect(() => {
    if (!logo) return
    return () => {
      URL.revokeObjectURL(logo.preview)
    }
  }, [logo])

  const dirty =
    banner !== null || logo !== null || Object.keys(changedColumns(initial, draft)).length > 0
  const problem = fieldProblem(draft)

  const set = useCallback((patch: Partial<VitrineDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    if (patch.slug !== undefined) setAddressProblem(null)
    setFailed(false)
  }, [])

  const pick = useCallback(async (kind: ImageKind, file: File) => {
    const refused = imageProblem(file)
    setImageError(refused)
    if (refused) return
    let blob: Blob
    try {
      blob = await resizeImage(file, MAX_WIDTH[kind])
    } catch {
      setImageError(UNREADABLE) // un SVG, une photo HEIC, un PDF renommé en .jpg
      return
    }
    const image = { blob, preview: URL.createObjectURL(blob) }
    if (kind === 'cover') setBanner(image)
    else setLogo(image)
    setFailed(false)
  }, [])

  const reset = useCallback(() => {
    setDraft(initial)
    setBanner(null)
    setLogo(null)
    setFailed(false)
    setAddressProblem(null)
    setImageError(null)
  }, [initial])

  const save = useCallback(async (): Promise<boolean> => {
    if (fieldProblem(draft)) return false
    const address = draft.slug !== initial.slug ? slugProblem(draft.slug) : null
    if (address) {
      setAddressProblem(address)
      return false
    }
    setSaving(true)
    setFailed(false)
    const sent: string[] = []
    let taken = false
    try {
      const columns = changedColumns(initial, draft)
      const images: Partial<Vitrine> = {}
      if (banner) {
        const { path, url } = await upload(vitrine.actorId, 'cover', banner)
        sent.push(path)
        columns.banner_url = images.bannerUrl = url
      }
      if (logo) {
        const { path, url } = await upload(vitrine.actorId, 'avatar', logo)
        sent.push(path)
        columns.avatar_url = images.avatarUrl = url
      }
      const { error } = await supabase
        .from('entities')
        .update(columns)
        .eq('actor_id', vitrine.actorId)
      taken = isSlugTaken(error)
      if (error) throw new Error(error.message)
      onSaved(published(vitrine, draft, images))
      return true
    } catch {
      if (sent.length > 0) await supabase.storage.from(GALLERY).remove(sent)
      if (taken) setAddressProblem('Cette adresse est déjà prise')
      else setFailed(true)
      return false
    } finally {
      setSaving(false)
    }
  }, [banner, draft, initial, logo, onSaved, vitrine])

  return {
    draft,
    original: initial,
    set,
    banner,
    logo,
    pickBanner: (file: File) => {
      void pick('cover', file)
    },
    pickLogo: (file: File) => {
      void pick('avatar', file)
    },
    dirty,
    problem,
    addressProblem,
    imageError,
    saving,
    failed,
    save,
    reset,
  }
}

export type VitrineEdit = ReturnType<typeof useVitrineEdit>
