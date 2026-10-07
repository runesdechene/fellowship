import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SimilarEvent {
  id: string
  name: string
  city: string
  department: string
  startDate: string
  endDate: string
}

/** En dessous, la recherche rendrait n'importe quoi. */
const MIN_LENGTH = 3

/** On laisse le temps de finir de taper avant d'interroger la base. */
const DEBOUNCE_MS = 400

/**
 * Les événements déjà présents qui ressemblent au nom saisi.
 *
 * S'appuie sur `search_similar_events`, qui compare par trigrammes — donc
 * tolérante aux fautes et aux formulations différentes. C'est ce qui évite
 * qu'un même festival soit créé trois fois sous trois orthographes.
 */
export function useSimilarEvents(name: string, enabled: boolean): SimilarEvent[] {
  // Le résultat est gardé AVEC la recherche qui l'a produit : on n'affiche
  // jamais les correspondances d'un nom qu'on vient de modifier.
  const [result, setResult] = useState<{ query: string; rows: SimilarEvent[] }>({
    query: '',
    rows: [],
  })

  const query = name.trim()
  const active = enabled && query.length >= MIN_LENGTH

  useEffect(() => {
    // Rien à chercher : l'état vide est dérivé plus bas, pas posé ici.
    if (!active) return

    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('search_similar_events', {
        search_name: query,
      })
      if (cancelled) return
      const rows = (data ?? []) as Array<{
        id: string
        name: string
        city: string
        department: string
        start_date: string
        end_date: string
      }>
      setResult({
        query,
        rows: rows.map((row) => ({
          id: row.id,
          name: row.name,
          city: row.city,
          department: row.department,
          startDate: row.start_date,
          endDate: row.end_date,
        })),
      })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, active])

  return active && result.query === query ? result.rows : []
}
