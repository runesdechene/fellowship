/**
 * QUOI     — le nombre de dates programmées de chaque enseigne, d'aujourd'hui à l'horizon des
 *            6 mois du gratuit.
 * POURQUOI — lot 9b : « Gratuit · 2 dates sur tes 6 prochains mois » dans Enseignes et abonnement.
 * ATTENTION — tant que rien n'est lu, ou si la lecture rate, le hook rend null : la phrase se tait
 *            sur le nombre plutôt que de dire « aucune date » (.claude/rules/v2.md).
 */
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import { PROGRAMMED_STATUSES } from '@/lib/friends'
import { proHorizon } from '@/lib/plan'
import { must, supabase } from '@/lib/supabase'

async function loadCounts(ids: string[]): Promise<Map<string, number>> {
  const today = new Date()
  const rows = must(
    await supabase
      .from('participations')
      .select('actor_id, events!inner(start_date)')
      .in('actor_id', ids)
      .in('status', PROGRAMMED_STATUSES)
      .gte('events.start_date', todayIso(today))
      .lt('events.start_date', todayIso(proHorizon(today))),
  )
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.actor_id, (counts.get(row.actor_id) ?? 0) + 1)
  return counts
}

export function useUpcomingCounts(ids: string[]): Map<string, number> | null {
  const [counts, setCounts] = useState<Map<string, number> | null>(null)
  const key = ids.join(',')

  useEffect(() => {
    if (key === '') return
    let cancelled = false
    async function run() {
      let next: Map<string, number> | null
      try {
        next = await loadCounts(key.split(','))
      } catch {
        next = null
      }
      if (cancelled) return
      setCounts(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key])

  return counts
}
