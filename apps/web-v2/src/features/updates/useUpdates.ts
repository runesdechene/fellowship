/**
 * QUOI     — lit les Nouveautés (notes, cœurs, commentaires et les noms de leurs auteurs), éteint
 *            la pastille en ouvrant la page, et écrit cœurs et commentaires.
 * POURQUOI — la page n'a plus qu'à afficher ; chaque écriture relit tout, la base fait foi.
 * ATTENTION — une lecture ratée s'affiche comme telle : jamais « aucune nouveauté » qui mente.
 */
import { useCallback, useEffect, useState } from 'react'
import type { UpdateComment, UpdateWeight } from '@/lib/app-updates'
import { fetchActorProfiles, type Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'

export interface AppUpdate {
  id: string
  version: string
  title: string
  body: string
  imageUrl: string | null
  weight: UpdateWeight
  publishedAt: string
  emailCount: number | null
  /** Les personnes qui ont mis un cœur, la plus récente d'abord. */
  hearts: string[]
  comments: UpdateComment[]
}

async function loadUpdates() {
  const notes = must(
    await supabase
      .from('app_updates')
      .select('id, version, title, body, image_url, weight, published_at, email_count')
      .order('published_at', { ascending: false })
      .order('id'),
  )
  const ids = notes.map((note) => note.id)
  const [hearts, comments] = ids.length
    ? await Promise.all([
        supabase
          .from('app_update_hearts')
          .select('update_id, actor_id')
          .in('update_id', ids)
          .order('created_at', { ascending: false })
          .order('actor_id')
          .then(must),
        supabase
          .from('app_update_comments')
          .select('id, update_id, parent_id, actor_id, entity_actor_id, body, created_at')
          .in('update_id', ids)
          .order('created_at')
          .order('id')
          .then(must),
      ])
    : [[], []]
  const actors = new Set([
    ...hearts.map((heart) => heart.actor_id),
    ...comments.flatMap((c) => [c.actor_id, ...(c.entity_actor_id ? [c.entity_actor_id] : [])]),
  ])
  const profiles = await fetchActorProfiles([...actors])
  const updates: AppUpdate[] = notes.map((note) => ({
    id: note.id,
    version: note.version,
    title: note.title,
    body: note.body,
    imageUrl: note.image_url,
    weight: note.weight === 'big' ? 'big' : 'small',
    publishedAt: note.published_at,
    emailCount: note.email_count,
    hearts: hearts.filter((h) => h.update_id === note.id).map((h) => h.actor_id),
    comments: comments
      .filter((c) => c.update_id === note.id)
      .map((c) => ({
        id: c.id,
        parentId: c.parent_id,
        actorId: c.actor_id,
        entityActorId: c.entity_actor_id,
        body: c.body,
        createdAt: c.created_at,
      })),
  }))
  return { updates, profiles }
}

/** `personId` : la personne connectée — elle seule met un cœur, écrit, et voit sa pastille éteinte. */
export function useUpdates(personId: string | undefined) {
  const [state, setState] = useState<{
    updates: AppUpdate[] | null
    profiles: Map<string, Friend>
    error: string | null
  }>({ updates: null, profiles: new Map(), error: null })
  const [round, setRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const loaded = await loadUpdates()
        if (cancelled) return
        setState({ ...loaded, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          updates: null,
          profiles: new Map(),
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])

  // Ouvrir la page, c'est avoir lu : la pastille s'éteint (une écriture ratée la laisse allumée).
  useEffect(() => {
    if (!personId) return
    void supabase
      .from('users')
      .update({ updates_seen_at: new Date().toISOString() })
      .eq('actor_id', personId)
  }, [personId])

  const write = useCallback(
    async (action: () => PromiseLike<{ error: { message: string } | null }>) => {
      setBusy(true)
      setProblem(null)
      const { error } = await action()
      if (error) setProblem(error.message)
      setBusy(false)
      setRound((r) => r + 1)
    },
    [],
  )

  const toggleHeart = useCallback(
    (updateId: string, on: boolean) => {
      if (!personId) return Promise.resolve()
      return write(() =>
        on
          ? supabase.from('app_update_hearts').insert({ update_id: updateId, actor_id: personId })
          : supabase
              .from('app_update_hearts')
              .delete()
              .eq('update_id', updateId)
              .eq('actor_id', personId),
      )
    },
    [personId, write],
  )

  const comment = useCallback(
    (updateId: string, body: string, parentId: string | null, entityActorId: string | null) => {
      if (!personId) return Promise.resolve()
      return write(() =>
        supabase.from('app_update_comments').insert({
          update_id: updateId,
          parent_id: parentId,
          actor_id: personId,
          entity_actor_id: entityActorId,
          body: body.trim(),
        }),
      )
    },
    [personId, write],
  )

  const remove = useCallback(
    (commentId: string) =>
      write(() => supabase.from('app_update_comments').delete().eq('id', commentId)),
    [write],
  )

  return { ...state, busy, problem, toggleHeart, comment, remove }
}
