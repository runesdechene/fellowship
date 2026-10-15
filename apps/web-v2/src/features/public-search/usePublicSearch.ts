/**
 * QUOI     — charge la recherche publique : les festivals des 3 prochains mois (ou moins) qui
 *            répondent à ?q / ?ou / ?quand, leur total, et combien attendent au-delà.
 * POURQUOI — lot 11b : la même requête que l'Explorer (lib/event-search.ts), sans acteur ;
 *            la fonction rend l'état, l'effet l'applique une fois. Les descriptions viennent
 *            d'une seconde lecture : la carte publique les montre, l'Explorer non.
 */
import { useEffect, useState } from 'react'
import {
  countBeyond,
  searchEvents,
  toSearchEvent,
  type SearchEvent,
  type SearchQuery,
} from '@/lib/event-search'
import { GUEST_MONTHS } from '@/lib/explorer'
import { descriptionExcerpt } from '@/lib/rich-text'
import { must, supabase } from '@/lib/supabase'

/** Au-delà, « Voir les N festivals » annonce le vrai total mais la grille s'arrête là. */
const PUBLIC_LIMIT = 100

export interface PublicEvent extends SearchEvent {
  /** L'extrait de la description, vide si le festival n'en a pas. */
  description: string
}

interface PublicSearch {
  events: PublicEvent[]
  total: number
  hiddenCount: number
  loading: boolean
  error: string | null
}

const EMPTY: PublicSearch = { events: [], total: 0, hiddenCount: 0, loading: true, error: null }

async function loadPublicSearch(query: SearchQuery): Promise<PublicSearch> {
  const today = new Date()
  const [response, hiddenCount] = await Promise.all([
    searchEvents(query, today, GUEST_MONTHS)
      .order('start_date', { ascending: true })
      .limit(PUBLIC_LIMIT),
    countBeyond(query, today, GUEST_MONTHS),
  ])
  const rows = must(response)
  const texts = rows.length
    ? must(
        await supabase
          .from('events')
          .select('id, description')
          .in(
            'id',
            rows.map((row) => row.id),
          ),
      )
    : []
  const descriptions = new Map(texts.map((row) => [row.id, descriptionExcerpt(row.description)]))
  return {
    events: rows.map((row) => ({
      ...toSearchEvent(row, today),
      description: descriptions.get(row.id) ?? '',
    })),
    total: response.count ?? rows.length,
    hiddenCount,
    loading: false,
    error: null,
  }
}

export function usePublicSearch({ q, ou, quand }: SearchQuery): PublicSearch {
  const [state, setState] = useState<PublicSearch>(EMPTY)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState((current) => ({ ...current, loading: true, error: null }))
      let next: PublicSearch
      try {
        next = await loadPublicSearch({ q, ou, quand, tag: null })
      } catch {
        next = { ...EMPTY, loading: false, error: 'La recherche n’a pas pu être chargée.' }
      }
      if (cancelled) return
      setState(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [q, ou, quand])

  return state
}
