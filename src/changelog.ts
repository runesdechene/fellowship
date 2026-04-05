export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-04-05',
    title: 'Le grand redesign',
    changes: [
      'Nouveau design system — Plus Jakarta Sans, flat, cuivre',
      'Calendrier avec bannières illustrées par mois',
      'Cards événements style Netflix',
      'Notifications intégrées dans la sidebar',
      'Profil unifié avec page publique',
      'Barre de recherche globale (⌘K)',
      'Bouton d\'ajout d\'événement flottant',
      'Toggle "Amis" sur le calendrier',
      'Présence sur les événements (statut + amis)',
      'Choix exposant/visiteur à l\'inscription',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-04',
    title: 'Lancement Fellowship',
    changes: [
      'Dashboard, Calendrier, Explorer',
      'Système de participations et reviews',
      'Profil exposant avec QR code',
      'Notifications et suivi d\'amis',
    ],
  },
]

export const LATEST_VERSION = changelog[0].version

const STORAGE_KEY = 'fellowship-changelog-seen'

export function hasSeenLatest(): boolean {
  const seen = localStorage.getItem(STORAGE_KEY)
  return seen === LATEST_VERSION
}

export function markAsSeen(): void {
  localStorage.setItem(STORAGE_KEY, LATEST_VERSION)
}
