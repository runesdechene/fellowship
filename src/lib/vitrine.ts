import type { VitrineLink } from '@/types/database'

export interface SeasonEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  department?: string
  tags: string[] | null
  image_url?: string | null
}

/** Sépare les événements en à venir (début ≥ now, tri croissant) et passés (tri décroissant). */
export function splitSeason(events: SeasonEvent[], now: Date): { upcoming: SeasonEvent[]; past: SeasonEvent[] } {
  const upcoming = events
    .filter(e => new Date(e.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const past = events
    .filter(e => new Date(e.start_date) < now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
  return { upcoming, past }
}

/** Hôte affichable d'une URL ; renvoie l'entrée brute si non parsable. */
export function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Nom d'icône lucide pour un type de lien de vitrine. */
export function linkTypeIcon(type: VitrineLink['type']): string {
  switch (type) {
    case 'website': return 'Globe'
    case 'shop': return 'ShoppingBag'
    case 'instagram': return 'Instagram'
    case 'facebook': return 'Facebook'
    default: return 'Link'
  }
}
