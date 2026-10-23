/**
 * QUOI     — ce qu'une fiche montre sans compte : la note, le nombre d'avis, un avis, le nombre
 *            de questions, qui y va (nombre et métiers).
 * POURQUOI — décision du 23/10/2026 : la fonction apercu_fiche ne rend que ces agrégats et un
 *            seul texte d'avis, jamais un auteur.
 * ATTENTION — `eventId` null (un membre) : rien n'est chargé. En cas d'échec, null plutôt que des
 *            zéros : l'aperçu est une invitation, son absence ne ment pas.
 */
import { useEffect, useState } from 'react'
import { metiersFrom, type Metier } from '@/lib/apercu'
import { must, supabase } from '@/lib/supabase'

export interface FicheApercu {
  reviews: number
  score: number | null
  excerpt: string | null
  excerptYear: number | null
  questions: number
  going: number
  crafts: Metier[]
}

async function loadApercu(eventId: string): Promise<FicheApercu | null> {
  const response = await supabase.rpc('apercu_fiche', { p_event: eventId })
  const [row] = must(response)
  if (!row) return null
  return {
    reviews: row.avis,
    score: row.note,
    excerpt: row.extrait,
    excerptYear: row.extrait_annee,
    questions: row.questions,
    going: row.exposants,
    crafts: metiersFrom(row.metiers),
  }
}

export function useFicheApercu(eventId: string | null): FicheApercu | null {
  const [apercu, setApercu] = useState<FicheApercu | null>(null)

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    async function run(id: string) {
      let next: FicheApercu | null
      try {
        next = await loadApercu(id)
      } catch {
        next = null
      }
      if (cancelled) return
      setApercu(next)
    }
    void run(eventId)
    return () => {
      cancelled = true
    }
  }, [eventId])

  return apercu
}
