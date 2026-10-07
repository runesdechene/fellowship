/**
 * QUOI     — les avis d'exposants sur une date : les moyennes (vue event_scores) et la liste des
 *            avis, chacun avec ce que la base autorise à montrer de son auteur.
 * POURQUOI — le bloc « Avis des exposants » de la fiche (maquette 2027).
 * ATTENTION — la liste passe par get_event_reviews : la lecture directe de `reviews` est fermée
 *            (identité protégée, migration 20260721170100). Jamais de nom hors `identity_visible`.
 */
import { useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export interface EventScores {
  count: number
  overall: number
  affluence: number
  organisation: number
  rentabilite: number
}

export interface EventReview {
  id: string
  comment: string | null
  createdAt: string
  identityVisible: boolean
  authorLabel: string | null
  isSelf: boolean
  overall: number
}

export interface EventReviews {
  scores: EventScores | null
  reviews: EventReview[]
  error: string | null
}

async function loadReviews(eventId: string, viewerId: string): Promise<EventReviews> {
  const [scoresResponse, reviewsResponse] = await Promise.all([
    supabase.from('event_scores').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.rpc('get_event_reviews', { p_event_id: eventId, p_viewer_actor: viewerId }),
  ])
  const scoreRow = must(scoresResponse)
  const reviews = must(reviewsResponse)
    .map((row) => ({
      id: row.review_id,
      comment: row.comment,
      createdAt: row.created_at,
      identityVisible: row.identity_visible,
      authorLabel: row.author_label,
      isSelf: row.is_self,
      overall: (row.affluence + row.organisation + row.rentabilite) / 3,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const count = scoreRow?.review_count ?? 0
  const scores =
    scoreRow && count > 0
      ? {
          count,
          overall: scoreRow.avg_overall ?? 0,
          affluence: scoreRow.avg_affluence ?? 0,
          organisation: scoreRow.avg_organisation ?? 0,
          rentabilite: scoreRow.avg_rentabilite ?? 0,
        }
      : null

  return { scores, reviews, error: null }
}

export function useEventReviews(
  eventId: string | undefined,
  viewerId: string | null | undefined,
): EventReviews {
  const [state, setState] = useState<EventReviews>({ scores: null, reviews: [], error: null })

  useEffect(() => {
    if (!eventId || !viewerId) return
    let cancelled = false

    async function run(currentEvent: string, currentViewer: string) {
      let next: EventReviews
      try {
        next = await loadReviews(currentEvent, currentViewer)
      } catch {
        next = { scores: null, reviews: [], error: 'Les avis n’ont pas pu être chargés.' }
      }
      if (cancelled) return
      setState(next)
    }

    void run(eventId, viewerId)
    return () => {
      cancelled = true
    }
  }, [eventId, viewerId])

  return state
}
