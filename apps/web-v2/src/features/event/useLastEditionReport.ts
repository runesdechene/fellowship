/**
 * QUOI     — le bilan de l'édition précédente d'un festival, pour l'acteur actif.
 * POURQUOI — retour client du 08/10/2026 : sur la fiche d'une nouvelle édition, revoir son bilan
 *            de l'an passé pour décider d'y retourner (lot 8b).
 * ATTENTION — rend null tant qu'il n'y a ni édition précédente, ni bilan REMPLI (isFilled : la
 *            place seule ne fait pas un bilan). Une erreur de lecture rend null aussi : c'est un
 *            rappel, pas une donnée de travail, et la fiche reste lisible sans lui.
 */
import { useEffect, useState } from 'react'
import { parseSqlDate } from '@/lib/dates'
import { isFilled, reportFigures, type ReportDate } from '@/lib/reports'
import { must, supabase } from '@/lib/supabase'

/** Ce que la fiche en dit : le résultat net, et de quoi ouvrir le bilan (maquette 2518:233). */
export interface LastEditionReport {
  eventId: string
  net: number
}

async function load(previousId: string, actorId: string): Promise<LastEditionReport | null> {
  const [eventResponse, ledgerResponse] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, start_date, end_date')
      .eq('id', previousId)
      .maybeSingle(),
    supabase
      .from('event_ledger_entries')
      .select('amount, direction, source')
      .eq('actor_id', actorId)
      .eq('event_id', previousId),
  ])
  const event = must(eventResponse)
  const lines = must(ledgerResponse)
  if (!event || !isFilled(lines)) return null
  const date: ReportDate = {
    eventId: event.id,
    name: event.name,
    imageUrl: null,
    tags: null,
    place: '',
    startDate: parseSqlDate(event.start_date),
    endDate: parseSqlDate(event.end_date),
    lines,
    secret: 'none',
  }
  return { eventId: event.id, net: reportFigures(date).net }
}

export function useLastEditionReport(
  previousId: string | null | undefined,
  actorId: string | null | undefined,
): LastEditionReport | null {
  const [state, setState] = useState<{ key: string; report: LastEditionReport | null }>({
    key: '',
    report: null,
  })
  const key = previousId && actorId ? `${actorId}/${previousId}` : ''

  useEffect(() => {
    if (!previousId || !actorId) return
    let cancelled = false
    const current = `${actorId}/${previousId}`
    load(previousId, actorId)
      .then((report) => {
        if (!cancelled) setState({ key: current, report })
      })
      .catch(() => {
        if (!cancelled) setState({ key: current, report: null })
      })
    return () => {
      cancelled = true
    }
  }, [previousId, actorId])

  // Un résultat chargé pour une autre fiche ou une autre enseigne ne s'affiche jamais.
  return state.key === key ? state.report : null
}
