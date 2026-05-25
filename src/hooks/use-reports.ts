import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EventReport, EventReportInsert } from '@/types/database'

export function useEventReport(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !currentActor) return
    supabase.from('event_reports').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
      .then(({ data }) => { setReport(data); setLoading(false) })
  }, [eventId, currentActor])

  return { report, loading }
}

export async function saveEventReport(report: EventReportInsert) {
  const { data, error } = await supabase
    .from('event_reports')
    .upsert(report, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}
