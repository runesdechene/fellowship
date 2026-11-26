/**
 * QUOI     — les trois chiffres de /decouvrir-v2 : festivals référencés, festivals à venir,
 *            exposants inscrits.
 * POURQUOI — un chiffre de la page est vrai ou absent. Tout ici se lit sans compte (les avis, eux,
 *            ne s'y lisent pas).
 * ATTENTION — une lecture ratée rend null : les chiffres se cachent, jamais un zéro.
 */
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

export interface Counts {
  events: number
  upcoming: number
  exhibitors: number
}

const HEAD = { count: 'exact', head: true } as const

async function loadCounts(): Promise<Counts | null> {
  const publicEvents = () => supabase.from('events').select('id', HEAD).eq('is_private', false)
  const [events, upcoming, exhibitors] = await Promise.all([
    publicEvents(),
    publicEvents().gte('end_date', todayIso(new Date())),
    supabase.from('entities').select('actor_id', HEAD).eq('type', 'exposant'),
  ])
  if (!events.count || !upcoming.count || !exhibitors.count) return null
  return { events: events.count, upcoming: upcoming.count, exhibitors: exhibitors.count }
}

export function useCounts(): Counts | null {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const next = await loadCounts().catch(() => null)
      if (!cancelled) setCounts(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return counts
}
