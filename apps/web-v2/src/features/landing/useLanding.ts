/**
 * QUOI     — ce que la landing lit en base : les catégories du défilé et les prochains festivals.
 * POURQUOI — lot 11a : de vraies dates et de vraies catégories. Tout ici est lisible sans compte
 *            (events, tags, participations — vérifié le 14/10/2026).
 * ATTENTION — une lecture ratée rend `festivals: null` : la section se cache plutôt que de
 *            montrer une rangée vide.
 */
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { CANDIDATES, pickNextFestivals, type LandingFestival } from '@/lib/landing'
import { supabase } from '@/lib/supabase'
import { fetchTags, type TagRow } from '@/lib/tags'

interface Landing {
  tags: TagRow[]
  festivals: LandingFestival[] | null
}

async function loadFestivals(today: Date): Promise<LandingFestival[] | null> {
  const events = await supabase
    .from('events')
    .select('id, name, image_url, tags, start_date, end_date, city, department, created_at')
    .eq('is_private', false)
    .gte('end_date', todayIso(today))
    .order('start_date')
    .order('id')
    .limit(CANDIDATES)
  if (events.error) return null

  const registered = new Map<string, number>()
  if (events.data.length > 0) {
    const goers = await supabase
      .from('participations')
      .select('event_id')
      .in(
        'event_id',
        events.data.map((e) => e.id),
      )
      .in('status', CONFIRMED_STATUSES)
    // Sans les inscrits, la rangée s'affiche quand même, sans « Populaire ».
    if (!goers.error) {
      for (const g of goers.data) registered.set(g.event_id, (registered.get(g.event_id) ?? 0) + 1)
    }
  }
  return pickNextFestivals(events.data, registered, today)
}

export function useLanding(): Landing {
  const [landing, setLanding] = useState<Landing>({ tags: [], festivals: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const today = new Date()
      const [tags, festivals] = await Promise.all([
        fetchTags(),
        loadFestivals(today).catch(() => null),
      ])
      if (cancelled) return
      setLanding({ tags, festivals })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return landing
}
