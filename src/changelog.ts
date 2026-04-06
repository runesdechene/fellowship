export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.4.1',
    date: '2026-04-06',
    title: 'Calendrier — amis cliquables',
    changes: [
      'Calendrier — participants plus visibles (texte plus sombre)',
      'Calendrier — clic sur les amis ouvre une modal détaillée',
      'Modal participants triés par Amis pro / Amis visiteurs',
      'Chaque ami affiche avatar, nom, type et statut',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-06',
    title: 'La fiche événement devient un cockpit',
    changes: [
      'Fiche événement redessinée — affiche grande, 2 colonnes, dashboard privé',
      'Dashboard exposant — stepper participation (Intéressé → En cours → Inscrit)',
      'Suivi paiement — 3 statuts (À payer / En cours / Payé)',
      'Encadré explicatif éphémère quand on change de statut',
      'Amis sur un festival — avatars en ligne avec statut',
      'Notes et Avis côte à côte',
      'Mobile — barre sticky en bas qui se déplie',
      'Comptes publics peuvent participer aux événements (Intéressé / J\'y vais)',
      'Séparation Activité (sidebar) vs Notifications (cloche top-right)',
      'Cloche avec dropdown de notifications personnelles',
      'Bouton "Suivre en retour" sur les notifications de nouvel abonné',
      'Lien site web affiché sur les profils exposants',
      'Noms cliquables dans les notifications → profil',
      'Amis et abonnés visibles par tous les visiteurs',
      'Email de contact + note d\'inscription sur les événements',
      'Notification quand un nouvel exposant rejoint Fellowship',
      'Avatars (photos de profil) dans les notifications',
      'Images événements en format portrait',
      'Calendrier — tri chronologique corrigé',
      'Modal création — ne se ferme plus au clic overlay',
      'Bouton + repositionné pour les téléphones avec barre home',
      'Scroll horizontal Explorer — padding respecté au snap',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-05',
    title: 'Fellowship prend forme',
    changes: [
      'Explorer Netflix — slideshow horizontal avec flèches',
      'Filtres par catégorie pastel + sélecteur de mois',
      'Calendrier — bannières SVG illustrées par saison',
      'Calendrier — présence (statut + amis) sur chaque événement',
      'Calendrier — toggle Amis pour voir les événements de ses amis',
      'Profil — bannière photo, bouton QR + édition sous la bannière',
      'Profil — amis & abonnés sur la page profil',
      'Profil — type d\'activité (forgeron, marque...)',
      'Profil — bouton Suivre sous le nom',
      'Profil accessible avec sidebar quand connecté',
      'URLs /@slug fonctionnelles',
      'Barre de recherche — avatar profil en haut à droite',
      'Changelog — popup des nouveautés',
      'Bouton + flottant global (FAB)',
      'Explorer = page d\'accueil',
      'Paddings et titres harmonisés sur toutes les pages',
      'Nouveau logo cuivre',
    ],
  },
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
