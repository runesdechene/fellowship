import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { NoteWithAuthor, NoteInsert } from '@/types/database'

type ActorPublicRow = { actor_id: string | null; label: string | null; avatar_url: string | null; entity_type: string | null; kind: string | null }

async function attachAuthors(rows: Array<{ actor_id: string | null; [k: string]: unknown }>): Promise<NoteWithAuthor[]> {
  const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean) as string[])]
  let byId: Record<string, ActorPublicRow> = {}
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('actor_public').select('actor_id, label, avatar_url, entity_type, kind').in('actor_id', actorIds)
    byId = Object.fromEntries(
      ((actors ?? []) as ActorPublicRow[])
        .filter(a => a.actor_id != null)
        .map(a => [a.actor_id as string, a])
    )
  }
  return rows.map(r => ({ ...r, actor_public: r.actor_id ? byId[r.actor_id] ?? null : null })) as unknown as NoteWithAuthor[]
}

/**
 * Notes d'un événement.
 *   - sans actorId  → toutes les notes (legacy / vue admin éventuelle)
 *   - avec actorId  → uniquement les notes privées de cet acteur (notes personnelles)
 *
 * Le mode personnel est utilisé sur la page Festival : les notes y sont privées,
 * lisibles seulement par leur auteur. Le « partagé » sera couvert plus tard par
 * la Discussion du festival (threads pour abonnés/amis).
 */
export function useEventNotes(eventId: string | undefined, actorId?: string | null) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!eventId) return
    let q = supabase
      .from('notes').select('*')
      .eq('event_id', eventId)
    if (actorId) q = q.eq('actor_id', actorId)
    const { data } = await q.order('created_at', { ascending: false })
    setNotes(await attachAuthors((data as Array<{ actor_id: string | null; [k: string]: unknown }> | null) ?? []))
    setLoading(false)
  }, [eventId, actorId])

  useEffect(() => {
    if (!eventId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes()
  }, [eventId, fetchNotes])

  return { notes, loading, refetch: fetchNotes }
}

export async function createNote(note: NoteInsert) {
  const { data, error } = await supabase.from('notes').insert(note).select('*').single()
  return { data, error }
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  return { error }
}
