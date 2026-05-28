import type { Event } from '@/types/database'

export type CandidatureState = 'open' | 'closed'

/** État des candidatures dérivé de la deadline. null si pas de deadline ou event passé. */
export function candidatureState(event: Event, now: Date = new Date()): CandidatureState | null {
  if (new Date(event.end_date) < now) return null
  if (!event.registration_deadline) return null
  return new Date(event.registration_deadline) >= now ? 'open' : 'closed'
}

/** Lien Google Maps de recherche (pas de lat/long en base → recherche textuelle). */
export function mapsSearchUrl(event: Event): string {
  const q = [event.name, event.city, event.department].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

/** Jours avant le début. null si l'event a déjà commencé/est passé. */
export function daysUntilStart(event: Event, now: Date = new Date()): number | null {
  const diff = Math.ceil((new Date(event.start_date).getTime() - now.getTime()) / 86400000)
  return diff > 0 ? diff : null
}

/** Au moins une info pratique optionnelle est renseignée. */
export function hasPracticalInfo(event: Event): boolean {
  return Boolean(
    event.opening_hours ||
    event.expected_attendance ||
    event.stand_size ||
    event.stand_price ||
    event.registration_deadline
  )
}

/** Au moins un moyen de candidater est connu (modale « Comment candidater » lite). */
export function hasApplyInfo(event: Event): boolean {
  return Boolean(event.contact_email || event.registration_url || event.registration_note)
}

/** Libellé d'édition : « 21ᵉ édition », « 1ʳᵉ édition ». null si absent. */
export function editionLabel(edition: number | null): string | null {
  if (!edition || edition < 1) return null
  return edition === 1 ? '1ʳᵉ édition' : `${edition}ᵉ édition`
}
