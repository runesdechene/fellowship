/**
 * QUOI     — les résultats en direct de la recherche plein écran : quatre festivals à venir, trois
 *            exposants, trois dates passées, pour les mots tapés.
 * POURQUOI — maquette 2606:301 : voir tout de suite ce qui répond, avant d'ouvrir Explorer. Mêmes
 *            requêtes qu'Explorer (lib/event-search, lib/exhibitor-search), seulement bornées.
 * ATTENTION — on attend 250 ms après la dernière lettre, et rien avant deux lettres : sinon une
 *            requête par touche. Une panne se dit telle quelle, jamais comme « rien trouvé ».
 */
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  searchEvents,
  searchPastEvents,
  toSearchEvent,
  type SearchEvent,
  type SearchQuery,
} from '@/lib/event-search'
import { exhibitorsQuery } from '@/lib/exhibitor-search'
import { FREE_MONTHS, searchPattern } from '@/lib/explorer'
import { must } from '@/lib/supabase'
import { usePlan } from '@/lib/usePlan'

const WAIT_MS = 250
export const MIN_LETTERS = 2

export interface QuickExhibitor {
  slug: string
  name: string
  avatarUrl: string | null
  craft: string | null
}

export interface QuickResults {
  upcoming: SearchEvent[]
  exhibitors: QuickExhibitor[]
  past: SearchEvent[]
}

interface QuickState {
  /** Les mots auxquels répondent ces résultats. */
  words: string
  results: QuickResults | null
  failed: boolean
}

async function loadQuick(words: string, viewerId: string, pro: boolean): Promise<QuickResults> {
  const today = new Date()
  const query: SearchQuery = { q: words, ou: '', quand: null, tags: [] }
  const [upcoming, past, exhibitors] = await Promise.all([
    // Connecté : sans borne en Pro, 6 mois en gratuit, comme Explorer.
    searchEvents(query, today, pro ? null : FREE_MONTHS)
      .order('start_date', { ascending: true })
      .limit(4),
    searchPastEvents(query, today).order('start_date', { ascending: false }).limit(3),
    exhibitorsQuery(searchPattern(words), null, viewerId)
      .order('brand_name', { ascending: true })
      .limit(3),
  ])
  return {
    upcoming: must(upcoming).map((row) => toSearchEvent(row, today)),
    past: must(past).map((row) => toSearchEvent(row, today)),
    exhibitors: must(exhibitors).flatMap((row) =>
      row.public_slug
        ? [
            {
              slug: row.public_slug,
              name: row.brand_name,
              avatarUrl: row.avatar_url,
              craft: row.craft_type,
            },
          ]
        : [],
    ),
  }
}

export function useQuickSearch(typed: string) {
  const { actor } = useAuth()
  const { pro } = usePlan()
  const viewerId = actor?.id ?? null
  const words = typed.trim()
  const [state, setState] = useState<QuickState>({ words: '', results: null, failed: false })

  useEffect(() => {
    if (!viewerId || words.length < MIN_LETTERS) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      loadQuick(words, viewerId, pro).then(
        (results) => {
          if (!cancelled) setState({ words, results, failed: false })
        },
        () => {
          if (!cancelled) setState({ words, results: null, failed: true })
        },
      )
    }, WAIT_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [viewerId, words, pro])

  // Les résultats des mots d'avant restent affichés le temps que les nouveaux arrivent.
  return words.length < MIN_LETTERS ? null : state
}
