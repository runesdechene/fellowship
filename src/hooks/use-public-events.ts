// src/hooks/use-public-events.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PublicEvent } from '@/lib/annuaire'

/** Colonnes strictement nécessaires à l'annuaire public. On ne fait jamais
 *  `select('*')` ici : la table porte des colonnes qui n'ont rien à faire
 *  dans une page anonyme (contact_email, acted_by_user_id…). */
const PUBLIC_EVENT_COLUMNS =
  'id, name, slug, city, department, start_date, end_date, image_url, tags, registration_url, registration_deadline, is_private'

export interface PublicEventsState {
  events: PublicEvent[]
  tagLabels: Record<string, string>
  loading: boolean
}

export function usePublicEvents(): PublicEventsState {
  const [state, setState] = useState<PublicEventsState>({ events: [], tagLabels: {}, loading: true })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const today = new Date().toISOString().slice(0, 10)
      const [evs, tags] = await Promise.all([
        supabase.from('events').select(PUBLIC_EVENT_COLUMNS)
          // Double garde : le filtre serveur évite de faire transiter les privés,
          // `toPublicList` refiltre côté client. Les deux sont voulus.
          .eq('is_private', false)
          .gte('end_date', today)
          .order('start_date', { ascending: true })
          .limit(200),
        // Colonne réelle en prod : `name`, pas `label` (vérifié sur la table live).
        supabase.from('tags').select('slug, name'),
      ])
      if (cancelled) return
      const labels = Object.fromEntries(
        ((tags.data ?? []) as Array<{ slug: string; name: string }>).map(t => [t.slug, t.name]))
      setState({ events: (evs.data ?? []) as unknown as PublicEvent[], tagLabels: labels, loading: false })
    }
    run().catch(() => { if (!cancelled) setState({ events: [], tagLabels: {}, loading: false }) })
    return () => { cancelled = true }
  }, [])

  return state
}
