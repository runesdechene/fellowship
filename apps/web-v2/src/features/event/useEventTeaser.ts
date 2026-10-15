/**
 * QUOI     — les nombres de l'aperçu flouté : combien d'avis et de questions a une fiche publique.
 * POURQUOI — lot 11b : la fonction compter_avis_et_questions ne rend que ces deux nombres à un
 *            visiteur, jamais un contenu.
 * ATTENTION — en cas d'échec, pas d'aperçu (null) plutôt qu'un « 0 » : l'aperçu est une invitation,
 *            pas une information ; son absence ne ment pas.
 */
import { useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

interface TeaserCounts {
  reviews: number
  questions: number
}

async function loadTeaser(eventId: string): Promise<TeaserCounts> {
  const response = await supabase.rpc('compter_avis_et_questions', { p_event: eventId })
  const [row] = must(response)
  return { reviews: row?.avis ?? 0, questions: row?.questions ?? 0 }
}

export function useEventTeaser(eventId: string): TeaserCounts | null {
  const [counts, setCounts] = useState<TeaserCounts | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      let next: TeaserCounts | null
      try {
        next = await loadTeaser(eventId)
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
  }, [eventId])

  return counts
}
