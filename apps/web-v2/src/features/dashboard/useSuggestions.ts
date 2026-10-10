/**
 * QUOI     — les suggestions « Pour toi » de l'acteur actif, et « Pas pour moi ».
 * POURQUOI — lot 8d. La base calcule (suggestions_for) ; un refus s'écrit dans
 *            suggestion_dismissals puis on relit, pour que la suivante prenne la place.
 * ATTENTION — une lecture ratée rend null : le bloc se tait. C'est une aide, pas une donnée de
 *            l'exposant — même exception que la recherche de doublons (.claude/rules/v2.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { readSuggestions, type Suggestions } from '@/lib/suggestions'
import { must, supabase } from '@/lib/supabase'

async function loadSuggestions(actorId: string): Promise<Suggestions | null> {
  try {
    return readSuggestions(must(await supabase.rpc('suggestions_for', { p_actor: actorId })))
  } catch {
    return null
  }
}

export function useSuggestions(actorId: string | undefined) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
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
