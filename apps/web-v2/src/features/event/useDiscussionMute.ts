/**
 * QUOI     — la sourdine de la discussion d'un festival, pour l'acteur actif : la lire, la basculer.
 * POURQUOI — retour client du 08/10/2026 : couper les notifications des nouvelles questions d'un
 *            festival. Une ligne discussion_mutes = en sourdine (le déclencheur la lit).
 * ATTENTION — l'écriture est optimiste ; un échec remet l'état d'avant et le dit.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export function useDiscussionMute(eventId: string, actorId: string | null | undefined) {
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function run(actor: string) {
      try {
        const response = await supabase
          .from('discussion_mutes')
          .select('event_id')
          .eq('actor_id', actor)
          .eq('event_id', eventId)
          .maybeSingle()
        const row = must(response)
        if (!cancelled) setMuted(row !== null)
      } catch {
        if (!cancelled) setMuted(false)
      }
    }
    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId])

  const toggle = useCallback(() => {
    if (!actorId) return
    const next = !muted
    setMuted(next)
    setFailed(false)
    const write = next
      ? supabase.from('discussion_mutes').insert({ actor_id: actorId, event_id: eventId })
      : supabase.from('discussion_mutes').delete().eq('actor_id', actorId).eq('event_id', eventId)
    void write.then(({ error }) => {
      if (error) {
        setMuted(!next)
        setFailed(true)
      }
    })
  }, [actorId, eventId, muted])

  return { muted, failed, toggle }
}
