export type NavKey = 'explorer' | 'mes-dates' | 'mes-createurs' | 'profil' | 'reglages' | 'dashboard' | 'calendrier' | 'communaute' | 'vitrine'
export type EntryState = 'active' | 'lock-pro' | 'bientot'
export type Plan = 'free' | 'pro'

export interface NavDef {
  key: NavKey
  to: string
  label: string
  shortLabel?: string // label compact pour la BottomBar mobile (sinon `label`)
  icon: string   // nom d'icône lucide (mappé en composant côté UI)
  pro: boolean   // surface Pro (cadenas si plan free)
  built: boolean // page réellement construite
}

export const NAV_DEFS: Record<NavKey, NavDef> = {
  explorer:        { key: 'explorer',        to: '/explorer',        label: 'Explorer',       icon: 'Compass',         pro: false, built: true },
  'mes-dates':     { key: 'mes-dates',       to: '/mes-dates',       label: 'Mes dates',      icon: 'CalendarClock',   pro: false, built: false },
  'mes-createurs': { key: 'mes-createurs',   to: '/mes-createurs',   label: 'Mes créateurs',  shortLabel: 'Créateurs', icon: 'Heart',           pro: false, built: false },
  dashboard:       { key: 'dashboard',       to: '/tableau-de-bord', label: 'Tableau de bord',shortLabel: 'Cockpit',   icon: 'LayoutDashboard', pro: true,  built: false },
  calendrier:      { key: 'calendrier',      to: '/calendrier',      label: 'Calendrier',     icon: 'CalendarDays',    pro: true,  built: true },
  communaute:      { key: 'communaute',      to: '/communaute',      label: 'Communauté',     icon: 'Users',           pro: true,  built: false },
  vitrine:         { key: 'vitrine',         to: '/profil',          label: 'Ma vitrine',     icon: 'Store',           pro: false, built: true },
  profil:          { key: 'profil',          to: '/profil',          label: 'Profil',         icon: 'User',            pro: false, built: true },
  reglages:        { key: 'reglages',        to: '/reglages',        label: 'Réglages',       icon: 'Settings',        pro: false, built: true },
}

const PERSON_NAV: NavKey[] = ['explorer', 'mes-dates', 'mes-createurs', 'profil', 'reglages']
const EXPOSANT_NAV: NavKey[] = ['explorer', 'dashboard', 'calendrier', 'communaute', 'vitrine', 'reglages']

// BottomBar mobile : 3 liens principaux par acteur (le reste → feuille de compte).
const PERSON_PRIMARY: NavKey[] = ['explorer', 'mes-dates', 'mes-createurs']
const EXPOSANT_PRIMARY: NavKey[] = ['dashboard', 'calendrier', 'explorer'] // Cockpit · Calendrier · Explorer

/** Items de nav selon le type d'acteur. (Toute entité = nav exposant en V1 ; festival/orga = V2.) */
export function navItemsFor(actor: { kind: string; entityType: string | null } | null): NavKey[] {
  if (!actor) return ['explorer']
  return actor.kind === 'entity' ? EXPOSANT_NAV : PERSON_NAV
}

/** Liens principaux de la BottomBar mobile (3 max) selon l'acteur. */
export function mobilePrimaryFor(actor: { kind: string } | null): NavKey[] {
  if (!actor) return ['explorer']
  return actor.kind === 'entity' ? EXPOSANT_PRIMARY : PERSON_PRIMARY
}

/** Liens secondaires (présents dans la nav de l'acteur mais hors BottomBar) → feuille de compte. */
export function mobileSecondaryFor(actor: { kind: string; entityType: string | null } | null): NavKey[] {
  const primary = new Set(mobilePrimaryFor(actor))
  return navItemsFor(actor).filter(k => !primary.has(k))
}

/** État d'une entrée : cadenas Pro prioritaire, puis « Bientôt » si non construite, sinon active. */
export function entryState(key: NavKey, plan: Plan): EntryState {
  const def = NAV_DEFS[key]
  if (def.pro && plan !== 'pro') return 'lock-pro'
  if (!def.built) return 'bientot'
  return 'active'
}

const SHARED_PREFIXES = ['/explorer', '/profil', '/reglages', '/evenement', '/notifications']

/** Une route est valide pour un acteur si elle est dans sa nav ou si c'est une surface partagée. */
export function isRouteValidFor(path: string, actor: { kind: string; entityType: string | null } | null): boolean {
  const navPaths = navItemsFor(actor).map(k => NAV_DEFS[k].to)
  return navPaths.some(p => path.startsWith(p)) || SHARED_PREFIXES.some(p => path.startsWith(p))
}

/**
 * Plan effectif de l'acteur actif : le Pro vit sur l'entité, jamais sur la personne.
 * `entityRow` est la ligne de l'acteur actif (UserRow | EntityRow) ; seul EntityRow porte `plan`.
 */
export function planForActor(actor: { kind: string } | null, entityRow: unknown): Plan {
  if (actor?.kind !== 'entity') return 'free'
  const plan = (entityRow as { plan?: Plan | null } | null | undefined)?.plan
  return plan === 'pro' ? 'pro' : 'free'
}
