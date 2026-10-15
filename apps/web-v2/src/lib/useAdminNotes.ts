/**
 * QUOI     — les notes internes et les étiquettes d'un acteur (enseigne ou personne).
 * POURQUOI — ce que l'équipe sait d'un compte et que le compte ne voit jamais (RLS : admins seuls).
 * ATTENTION — l'auteur est lu dans actor_public (users ne se lit plus que sur sa propre ligne).
 *             Une écriture refusée lève une erreur : l'appelant l'affiche et garde la saisie.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { must, supabase } from './supabase'

export interface Note {
  id: string
  body: string
  created_at: string
  author: string | null
}

const LABEL_EXISTS = 'Cette étiquette existe déjà.'

async function loadNotes(actorId: string): Promise<{ notes: Note[]; labels: string[] }> {
  const [notes, labels] = await Promise.all([
    supabase
      .from('admin_notes')
      .select('id, body, created_at, author_user_id')
      .eq('actor_id', actorId)
      .order('created_at', { ascending: false })
      .order('id'),
    supabase
      .from('admin_labels')
      .select('label')
      .eq('actor_id', actorId)
      .order('created_at')
      .order('label'),
  ])
  const rows = must(notes)
  const authorIds = [...new Set(rows.flatMap((n) => (n.author_user_id ? [n.author_user_id] : [])))]
  const authors = authorIds.length
    ? must(await supabase.from('actor_public').select('actor_id, label').in('actor_id', authorIds))
    : []
  const names = new Map(authors.flatMap((a) => (a.actor_id ? [[a.actor_id, a.label]] : [])))
  return {
    notes: rows.map((n) => ({
      id: n.id,
      body: n.body,
      created_at: n.created_at,
      author: n.author_user_id ? (names.get(n.author_user_id) ?? null) : null,
    })),
    labels: must(labels).map((l) => l.label),
  }
}

export function useAdminNotes(actorId: string) {
  const { person } = useAuth()
  const [state, setState] = useState<{ notes: Note[]; labels: string[]; error: string | null }>({
    notes: [],
    labels: [],
    error: null,
  })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadNotes(actorId)
        if (cancelled) return
        setState({ ...data, error: null })
      } catch (error) {
        if (cancelled) return
        setState((s) => ({
          ...s,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        }))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actorId, round])

  const write = useCallback(
    async (job: PromiseLike<{ error: { message: string; code?: string } | null }>) => {
      const { error } = await job
      if (error?.code === '23505') throw new Error(LABEL_EXISTS)
      if (error) throw new Error(error.message)
      setRound((r) => r + 1)
    },
    [],
  )

  return {
    ...state,
    addNote: (body: string) =>
      write(
        supabase.from('admin_notes').insert({
          actor_id: actorId,
          body: body.trim(),
          author_user_id: person?.actor_id ?? null,
        }),
      ),
    addLabel: (label: string) => {
      const clean = label.trim()
      if (state.labels.some((l) => l.toLowerCase() === clean.toLowerCase())) {
        return Promise.reject(new Error(LABEL_EXISTS))
      }
      return write(supabase.from('admin_labels').insert({ actor_id: actorId, label: clean }))
    },
    removeLabel: (label: string) =>
      write(supabase.from('admin_labels').delete().eq('actor_id', actorId).eq('label', label)),
  }
}
