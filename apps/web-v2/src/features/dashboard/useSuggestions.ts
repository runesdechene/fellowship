/**
 * QUOI     — les suggestions « Pour toi » de l'acteur actif, et « Pas pour moi ».
 * POURQUOI — lot 8d. La base calcule (suggestions_for) ; un refus s'écrit dans
 *            suggestion_dismissals puis on relit, pour que la suivante prenne la place.
 * ATTENTION — une lecture ratée rend null : le bloc se tait. C'est une aide, pas une donnée de
 *            l'exposant — même exception que la recherche de doublons (.claude/rules/v2.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { fetchFriendsByEvent, type Friend } from '@/lib/friends'
import { readSuggestions, type Suggestion } from '@/lib/suggestions'
import { must, supabase } from '@/lib/supabase'

/** Une suggestion à l'écran : sa catégorie (l'affiche absente) et les amis qui y vont. */
export interface ShownSuggestion extends Suggestion {
  tags: string[] | null
  friends: Friend[]
}

interface ShownSuggestions {
  count: number
  items: ShownSuggestion[]
}

async function loadSuggestions(actorId: string): Promise<ShownSuggestions | null> {
  try {
    const found = readSuggestions(must(await supabase.rpc('suggestions_for', { p_actor: actorId })))
    const ids = found.items.map((item) => item.eventId)
    if (ids.length === 0) return { count: found.count, items: [] }
    const [events, friendsByEvent] = await Promise.all([
      supabase.from('events').select('id, tags').in('id', ids),
      fetchFriendsByEvent(actorId, ids),
    ])
    const tagsByEvent = new Map(must(events).map((event) => [event.id, event.tags]))
    return {
      count: found.count,
      items: found.items.map((item) => ({
        ...item,
        tags: tagsByEvent.get(item.eventId) ?? null,
        friends: friendsByEvent.get(item.eventId) ?? [],
      })),
    }
  } catch {
    return null
  }
}

export function useSuggestions(actorId: string | undefined) {
  const [suggestions, setSuggestions] = useState<ShownSuggestions | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    void loadSuggestions(actorId).then((found) => {
      if (cancelled) return
      setSuggestions(found)
    })
    return () => {
      cancelled = true
    }
  }, [actorId, version])

  const dismiss = useCallback(
    async (eventId: string) => {
      if (!actorId) return
      must(
        await supabase
          .from('suggestion_dismissals')
          .insert({ actor_id: actorId, event_id: eventId }),
      )
      setVersion((current) => current + 1)
    },
    [actorId],
  )

  return { suggestions, dismiss }
}
