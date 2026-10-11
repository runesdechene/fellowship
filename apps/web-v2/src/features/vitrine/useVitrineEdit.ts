/**
 * QUOI     — le mode édition d'une vitrine : le brouillon, les images en attente, ce qui a changé,
 *            et l'enregistrement (images réduites puis envoyées, puis un seul `update`).
 * POURQUOI — lot 6b (spec du 11/10/2026) : on modifie en place et rien n'est publié avant
 *            « Enregistrer » ; « Annuler » ne laisse rien derrière lui, pas même une image envoyée.
 * ATTENTION — l'écriture passe par `entities_update_member` (can_act_as) ; plan, Pro offert,
 *            Ambassadeur et Certifié sont protégés par déclencheur. Une adresse prise revient en
 *            `addressProblem`, jamais en échec silencieux.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { imageProblem, resizeImage } from '@/lib/image-resize'
import { supabase } from '@/lib/supabase'
import {
  changedColumns,
  fieldProblem,
  isSlugTaken,
  slugProblem,
  type VitrineDraft,
} from '@/lib/vitrine-edit'
import type { Vitrine } from './useVitrine'

export interface PendingImage {
  file: File
  /** Une adresse locale : l'aperçu s'affiche sans rien envoyer. */
  preview: string
}

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

async function upload(actorId: string, kind: ImageKind, image: PendingImage): Promise<string> {
  const blob = await resizeImage(image.file, MAX_WIDTH[kind])
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${actorId}/${kind}/${String(Date.now())}.${extension}`
  const { error } = await supabase.storage
    .from('entity-gallery')
    .upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('entity-gallery').getPublicUrl(path).data.publicUrl
}

export function useVitrineEdit(vitrine: Vitrine, onSaved: (slug: string) => void) {
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

  const pick = useCallback((kind: ImageKind, file: File) => {
    const refused = imageProblem(file)
    setImageError(refused)
    if (refused) return
    const image = { file, preview: URL.createObjectURL(file) }
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
    try {
      const columns = changedColumns(initial, draft)
      if (banner) columns.banner_url = await upload(vitrine.actorId, 'cover', banner)
      if (logo) columns.avatar_url = await upload(vitrine.actorId, 'avatar', logo)
      if (Object.keys(columns).length > 0) {
        const { error } = await supabase
          .from('entities')
          .update(columns)
          .eq('actor_id', vitrine.actorId)
        if (isSlugTaken(error)) {
          setAddressProblem('Cette adresse est déjà prise')
          return false
        }
        if (error) throw new Error(error.message)
      }
      onSaved(draft.slug)
      return true
    } catch {
      setFailed(true)
      return false
    } finally {
      setSaving(false)
    }
  }, [banner, draft, initial, logo, onSaved, vitrine.actorId])

  return {
    draft,
    original: initial,
    set,
    banner,
    logo,
    pickBanner: (file: File) => {
      pick('cover', file)
    },
    pickLogo: (file: File) => {
      pick('avatar', file)
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
