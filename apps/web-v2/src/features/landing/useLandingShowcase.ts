/**
 * QUOI     — ce que la landing lit en base, sans compte : les festivals publics à venir, leurs
 *            inscrits, les derniers festivals ajoutés et passés, le nombre d'exposants et leurs avatars.
 * POURQUOI — lot 11c : chaque élément de la landing est vivant. Tout ici est lisible sans compte
 *            (events, participations, entities — vérifié le 14/10/2026).
 * ATTENTION — une lecture ratée rend une liste vide ou null, jamais une exception : l'écran qui en
 *            dépend se cache (lib/landing.ts). Tant que rien n'est lu, `showcase` vaut null.
 */
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { buildShowcase, pickFaces, type Showcase, type ShowcaseRow } from '@/lib/landing'
import { supabase } from '@/lib/supabase'

const UPCOMING = 120 /* les douze mois du calendrier Pro */
const PAST = 3
const RECENT = 3
/** Le plafond du serveur (max-rows) : au-delà, la lecture serait tronquée sans le dire. */
const PARTICIPATIONS = 1000
const AVATARS = 200
const COLUMNS = 'id, name, image_url, tags, start_date, end_date, city, department, created_at'

async function loadShowcase(today: Date): Promise<Showcase> {
  const from = todayIso(today)
  const [upcoming, recent, past, exhibitors, avatars] = await Promise.all([
    supabase
      .from('events')
      .select(COLUMNS)
      .eq('is_private', false)
      .gte('end_date', from)
      .order('start_date')
      .order('id')
      .limit(UPCOMING),
    supabase
      .from('events')
      .select(COLUMNS)
      .eq('is_private', false)
      .gte('end_date', from)
      .order('created_at', { ascending: false })
      .order('id')
      .limit(RECENT),
    supabase
      .from('events')
      .select(COLUMNS)
      .eq('is_private', false)
      .lt('end_date', from)
      .order('end_date', { ascending: false })
      .order('id')
      .limit(PAST),
    supabase
      .from('entities')
      .select('actor_id', { count: 'exact', head: true })
      .eq('type', 'exposant'),
    supabase
      .from('entities')
      .select('actor_id, avatar_url')
      .eq('type', 'exposant')
      .not('avatar_url', 'is', null)
      .order('actor_id')
      .limit(AVATARS),
  ])
  const rows: ShowcaseRow[] = upcoming.error ? [] : upcoming.data

  const registered = new Map<string, number>()
  if (rows.length > 0) {
    const goers = await supabase
      .from('participations')
      .select('event_id')
      .in(
        'event_id',
        rows.map((r) => r.id),
      )
      .in('status', CONFIRMED_STATUSES)
      .order('event_id')
      .order('actor_id')
      .limit(PARTICIPATIONS)
    if (!goers.error) {
      for (const g of goers.data) registered.set(g.event_id, (registered.get(g.event_id) ?? 0) + 1)
    }
  }

  return buildShowcase(
    {
      upcoming: rows,
      registered,
      recent: recent.error ? [] : recent.data,
      past: past.error ? [] : past.data,
      exhibitors: exhibitors.error ? null : exhibitors.count,
      faces: avatars.error
        ? []
        : pickFaces(
            avatars.data.flatMap((a) => (a.avatar_url ? [{ ...a, avatar_url: a.avatar_url }] : [])),
            Math.random,
          ),
    },
    today,
  )
}

export function useLandingShowcase(): Showcase | null {
  const [showcase, setShowcase] = useState<Showcase | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const today = new Date()
      const next = await loadShowcase(today).catch(() =>
        buildShowcase(
          {
            upcoming: [],
            registered: new Map(),
            recent: [],
            past: [],
            exhibitors: null,
            faces: [],
          },
          today,
        ),
      )
      if (!cancelled) setShowcase(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return showcase
}
