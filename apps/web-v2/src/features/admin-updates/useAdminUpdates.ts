/**
 * QUOI     — l'administration des Nouveautés : lit les notes publiées (cœurs, commentaires, e-mail)
 *            et le nombre d'exposants qu'atteindrait un e-mail ; publie, corrige, supprime, envoie
 *            l'image.
 * POURQUOI — publier passe par publish_app_update (la note et les notifications d'un coup) ; une
 *            grosse part ensuite par e-mail (fonction app-update-email, qui n'envoie qu'une fois).
 *            Corriger une note ne renvoie rien : seuls version, titre, texte et image s'écrivent.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import type { UpdateWeight } from '@/lib/app-updates'
import { resizeImage } from '@/lib/image-resize'
import { must, supabase } from '@/lib/supabase'

export interface UpdateDraft {
  version: string
  title: string
  body: string
  imageUrl: string | null
  weight: UpdateWeight
}

export interface PublishedUpdate extends UpdateDraft {
  id: string
  publishedAt: string
  emailCount: number | null
  hearts: number
  comments: number
}

const BUCKET = 'app-updates'
const IMAGE_WIDTH = 1360

export async function uploadUpdateImage(file: File): Promise<string> {
  const blob = await resizeImage(file, IMAGE_WIDTH)
  const path = `${String(Date.now())}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** L'e-mail d'une grosse note. La fonction refuse un second envoi ; un échec total la laisse
 *  envoyable, d'où « Envoyer l'e-mail » dans la liste. */
export async function sendUpdateEmail(id: string): Promise<void> {
  const response = await supabase.functions.invoke<{ sent?: number }>('app-update-email', {
    body: { updateId: id },
  })
  if (response.error) throw new Error('La note est publiée, mais l’e-mail n’est pas parti.')
}

/** Publie la note (et ses notifications) ; une grosse part ensuite par e-mail. Une fois la note
 *  publiée, plus rien ne se rejoue d'ici : un e-mail raté se relance depuis la liste, jamais en
 *  republiant (ce serait une seconde note et une seconde vague de notifications). */
export async function publishUpdate(draft: UpdateDraft): Promise<{ mailProblem: string | null }> {
  const id = must(
    await supabase.rpc('publish_app_update', {
      p_version: draft.version,
      p_title: draft.title,
      p_body: draft.body,
      p_image_url: draft.imageUrl ?? '',
      p_weight: draft.weight,
    }),
  )
  if (draft.weight !== 'big') return { mailProblem: null }
  try {
    await sendUpdateEmail(id)
    return { mailProblem: null }
  } catch (failure) {
    return { mailProblem: failure instanceof Error ? failure.message : 'L’e-mail n’est pas parti.' }
  }
}

export async function saveUpdate(id: string, draft: Omit<UpdateDraft, 'weight'>): Promise<void> {
  const { error } = await supabase
    .from('app_updates')
    .update({
      version: draft.version.trim(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      image_url: draft.imageUrl,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteUpdate(id: string): Promise<void> {
  const { error } = await supabase.from('app_updates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

async function loadAdminUpdates() {
  const [notes, hearts, comments, audience] = await Promise.all([
    supabase
      .from('app_updates')
      .select('id, version, title, body, image_url, weight, published_at, email_count')
      .order('published_at', { ascending: false })
      .order('id')
      .then(must),
    supabase.from('app_update_hearts').select('update_id').then(must),
    supabase.from('app_update_comments').select('update_id').then(must),
    supabase.rpc('app_update_audience').then(must),
  ])
  const count = (rows: { update_id: string }[], id: string) =>
    rows.filter((row) => row.update_id === id).length
  const updates: PublishedUpdate[] = notes.map((note) => ({
    id: note.id,
    version: note.version,
    title: note.title,
    body: note.body,
    imageUrl: note.image_url,
    weight: note.weight === 'big' ? 'big' : 'small',
    publishedAt: note.published_at,
    emailCount: note.email_count,
    hearts: count(hearts, note.id),
    comments: count(comments, note.id),
  }))
  return { updates, audience }
}

export function useAdminUpdates() {
  const [state, setState] = useState<{
    updates: PublishedUpdate[] | null
    audience: number | null
    error: string | null
  }>({ updates: null, audience: null, error: null })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const loaded = await loadAdminUpdates()
        if (cancelled) return
        setState({ ...loaded, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          updates: null,
          audience: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
