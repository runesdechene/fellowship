import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EventReport, EventReportInsert } from '@/types/database'

export function useEventReport(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!eventId || !currentActor) return
    const { data } = await supabase.from('event_reports').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
    setReport(data)
    setLoading(false)
  }, [eventId, currentActor])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { report, loading, refetch }
}

export async function saveEventReport(report: EventReportInsert) {
  const { data, error } = await supabase
    .from('event_reports')
    .upsert(report, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}

/** Ensemble des event_id pour lesquels l'acteur actif a déjà rempli un bilan.
 *  `refetch` à rappeler après l'enregistrement d'un bilan (sinon le prompt ne disparaît pas). */
export function useMyReportedEventIds(): { reportedEventIds: Set<string>; loading: boolean; refetch: () => Promise<void> } {
  const { currentActor } = useAuth()
  const [reportedEventIds, setReportedEventIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    const { data } = await supabase
      .from('event_reports')
      .select('event_id')
      .eq('actor_id', currentActor.id)
    const rows = (data ?? []) as Array<{ event_id: string }>
    setReportedEventIds(new Set(rows.map(r => r.event_id)))
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { reportedEventIds, loading, refetch }
}

/** Tous les bilans de l'acteur actif, indexés par event_id. `refetch` après save. */
export function useMyReports(): { reportsByEvent: Map<string, EventReport>; loading: boolean; refetch: () => Promise<void> } {
  const { currentActor } = useAuth()
  const [reportsByEvent, setReportsByEvent] = useState<Map<string, EventReport>>(new Map())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    const { data } = await supabase.from('event_reports').select('*').eq('actor_id', currentActor.id)
    const rows = (data ?? []) as EventReport[]
    setReportsByEvent(new Map(rows.map(r => [r.event_id, r])))
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { reportsByEvent, loading, refetch }
}
