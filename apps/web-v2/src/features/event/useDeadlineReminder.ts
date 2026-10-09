/**
 * QUOI     — le rappel de clôture des candidatures d'un festival, pour l'acteur actif : le lire,
 *            le basculer.
 * POURQUOI — lot 8c : l'interrupteur « Me rappeler la clôture des candidatures » de la fiche. La
 *            base allume le rappel quand on repère un festival (participations.remind_deadline) ;
 *            la tâche du matin le lit.
 * ATTENTION — relu à chaque changement de statut, une fois son écriture finie (`statusSaving`) :
 *            la base allume ou éteint le rappel avec le statut, et une lecture partie avant
 *            l'écriture rendrait l'ancien état (relecture du 09/10/2026). Sur un festival pas
 *            encore suivi, allumer le rappel le repère (le déclencheur fait le reste). Une bascule
 *            à la fois (`saving`).
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { ParticipationStatus } from '@/types/database'

export function useDeadlineReminder(
  eventId: string,
  actorId: string | null | undefined,
  status: ParticipationStatus | null,
  setStatus: (next: ParticipationStatus | null) => Promise<void>,
  statusSaving: boolean,
) {
  const [on, setOn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!actorId || statusSaving) return
    let cancelled = false
    async function run(actor: string) {
      try {
        const response = await supabase
          .from('participations')
          .select('remind_deadline')
          .eq('actor_id', actor)
          .eq('event_id', eventId)
          .maybeSingle()
        const row = must(response)
        if (cancelled) return
        setOn(row?.remind_deadline ?? false)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId, status, statusSaving])

  const toggle = useCallback(async () => {
    if (!actorId || saving || statusSaving) return
    const next = !on
    setOn(next)
    setSaving(true)
    setFailed(false)
    if (status === null) {
      // Repérer allume le rappel en base ; la relecture qui suit le changement de statut le confirme.
      await setStatus('interesse')
      setSaving(false)
      return
    }
    const { error } = await supabase
      .from('participations')
      .update({ remind_deadline: next })
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
    if (error) {
      setOn(!next)
      setFailed(true)
    }
    setSaving(false)
  }, [actorId, eventId, on, saving, status, setStatus, statusSaving])

  return { on, saving, failed, toggle }
}
