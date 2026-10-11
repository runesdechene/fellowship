/**
 * QUOI     — ce que montre le mur de la connexion : les affiches des festivals publics à venir, le
 *            nombre de festivals et celui d'exposants.
 * POURQUOI — lot 10a : de vrais chiffres (Uriel, 11/10/2026). La page est vue sans compte : tout ici
 *            est lisible par un visiteur anonyme (vérifié le 11/10/2026).
 * ATTENTION — une lecture ratée rend null, jamais 0 : le mur se tait plutôt que d'annoncer zéro.
 */
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

const POSTERS = 12

interface Wall {
  posters: string[]
  events: number | null
  exposants: number | null
}

async function loadWall(): Promise<Wall> {
  const [posters, events, exposants] = await Promise.all([
    supabase
      .from('events')
      .select('image_url')
      .eq('is_private', false)
      .gte('end_date', todayIso(new Date()))
      .not('image_url', 'is', null)
      .order('start_date')
      .limit(POSTERS),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_private', false),
    supabase
      .from('entities')
      .select('actor_id', { count: 'exact', head: true })
      .eq('type', 'exposant'),
  ])
  return {
    posters: posters.error
      ? []
      : posters.data.flatMap((row) => (row.image_url ? [row.image_url] : [])),
    events: events.error ? null : events.count,
    exposants: exposants.error ? null : exposants.count,
  }
}

export function useLoginWall(): Wall {
  const [wall, setWall] = useState<Wall>({ posters: [], events: null, exposants: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const next = await loadWall().catch(() => ({ posters: [], events: null, exposants: null }))
      if (cancelled) return
      setWall(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return wall
}
