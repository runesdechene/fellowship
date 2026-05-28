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
