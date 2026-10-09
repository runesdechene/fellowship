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

export interface LastEditionReport {
  eventId: string
  name: string
  startDate: Date
  endDate: Date
  revenue: number
  costs: number
  net: number
  revenueGoal: number | null
  wins: string[]
  improvements: string[]
}

async function load(previousId: string, actorId: string): Promise<LastEditionReport | null> {
  const [eventResponse, ledgerResponse, reportResponse, dossierResponse] = await Promise.all([
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
    supabase
      .from('event_reports')
      .select('wins, improvements')
      .eq('actor_id', actorId)
      .eq('event_id', previousId)
      .maybeSingle(),
    supabase
      .from('participation_dossiers')
      .select('revenue_goal')
      .eq('actor_id', actorId)
      .eq('event_id', previousId)
      .maybeSingle(),
  ])
  const event = must(eventResponse)
  const lines = must(ledgerResponse)
  if (!event || !isFilled(lines)) return null
  const report = must(reportResponse)
  const dossier = must(dossierResponse)
  const date: ReportDate = {
    eventId: event.id,
    name: event.name,
    imageUrl: null,
    place: '',
    startDate: parseSqlDate(event.start_date),
    endDate: parseSqlDate(event.end_date),
    lines,
  }
  const { revenue, costs, net } = reportFigures(date)
  return {
    eventId: event.id,
    name: event.name,
    startDate: date.startDate,
    endDate: date.endDate,
    revenue,
    costs,
    net,
    revenueGoal: dossier?.revenue_goal ?? null,
    wins: report?.wins ?? [],
    improvements: report?.improvements ?? [],
  }
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
