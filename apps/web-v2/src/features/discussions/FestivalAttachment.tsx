/**
 * QUOI     — le festival joint à un message : au-dessus de la saisie (avec sa croix), puis en tête
 *            de la bulle envoyée.
 * POURQUOI — « Écrire » depuis le fil de Ma communauté ouvre la conversation avec le festival dont
 *            on parle (maquette 2815:233). Le message ne garde que l'identifiant ; la carte se lit ici.
 * ATTENTION — une fiche devenue illisible (privée, supprimée) ou une lecture ratée n'affiche rien :
 *            le message reste lisible sans sa carte.
 */
import { useEffect, useState } from 'react'
import { EventChip } from '@/components/ui/EventChip'
import { fetchEventBrief, type EventBrief } from '@/lib/discussion-api'

export function FestivalAttachment({
  eventId,
  onRemove,
}: {
  eventId: string
  onRemove?: () => void
}) {
  const [brief, setBrief] = useState<EventBrief | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEventBrief(eventId).then(
      (found) => {
        if (!cancelled) setBrief(found)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (!brief) return null
  return <EventChip event={{ ...brief, tags: brief.tags ?? [] }} onRemove={onRemove} />
}
