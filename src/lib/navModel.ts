export type NavKey = 'explorer' | 'mes-dates' | 'mes-createurs' | 'profil' | 'reglages' | 'dashboard' | 'calendrier' | 'communaute' | 'vitrine' | 'carte'
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
  'mes-dates':     { key: 'mes-dates',       to: '/mes-dates',       label: 'Mes dates',      icon: 'CalendarClock',   pro: false, built: true },
  'mes-createurs': { key: 'mes-createurs',   to: '/mes-createurs',   label: 'Mes créateurs',  shortLabel: 'Créateurs', icon: 'Heart',           pro: false, built: false },
  dashboard:       { key: 'dashboard',       to: '/tableau-de-bord', label: 'Cockpit',        shortLabel: 'Cockpit',   icon: 'LayoutDashboard', pro: true,  built: true },
  calendrier:      { key: 'calendrier',      to: '/calendrier',      label: 'Calendrier',     icon: 'CalendarDays',    pro: false, built: true },
  carte:           { key: 'carte',           to: '/carte',           label: 'Carte',          icon: 'Map',             pro: false, built: true },
  communaute:      { key: 'communaute',      to: '/communaute',      label: 'Communauté',     icon: 'Users',           pro: true,  built: true },
  vitrine:         { key: 'vitrine',         to: '/profil',          label: 'Ma vitrine',     icon: 'Store',           pro: false, built: true },
  profil:          { key: 'profil',          to: '/profil',          label: 'Profil',         icon: 'User',            pro: false, built: true },
  reglages:        { key: 'reglages',        to: '/reglages',        label: 'Réglages',       icon: 'Settings',        pro: false, built: true },
}

// Festivalier : pas d'entrée « Profil » — il n'a pas de vitrine.
// (L'avatar perso + lien /reglages tient lieu d'accès au compte.)
// `calendrier` est la surface dates unique (gratuit nerfé / Pro complet) — a remplacé « Mes dates » (#9 lot 1).
const PERSON_NAV: NavKey[] = ['explorer', 'calendrier', 'carte', 'mes-createurs', 'reglages']
const EXPOSANT_NAV: NavKey[] = ['explorer', 'dashboard', 'calendrier', 'carte', 'communaute', 'vitrine', 'reglages']

// BottomBar mobile : 3 liens principaux par acteur (le reste → feuille de compte).
const PERSON_PRIMARY: NavKey[] = ['explorer', 'calendrier', 'mes-createurs']
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

// /profil n'est PAS partagé : c'est la vitrine d'un exposant. Un festivalier qui y atterrit
// par deep-link est redirigé sur /explorer (cf. isRouteValidFor → la nav exposant l'autorise).
// /suivis est accessible aux deux acteurs (page FollowingPage commune) — il doit être ici
// car il n'est dans aucune nav (entrée via l'avatar / lien profil), sinon AppLayout le bloque.
// /boutique et /abonnement : accessibles aux 2 acteurs (la page elle-même affiche un
// message si l'acteur actif n'est pas une entité — cf. v0.7.170 Stripe MVP).
const SHARED_PREFIXES = ['/explorer', '/reglages', '/evenement', '/e/', '/notifications', '/suivis', '/boutique', '/abonnement']

// Premiers segments réservés aux routes applicatives (cf. App.tsx). Tout autre
// chemin à un seul segment (`/{slug}`) est une vitrine/profil public.
const RESERVED_TOP = new Set([
  'explorer', 'calendrier', 'carte', 'communaute', 'tableau-de-bord', 'dashboard',
  'mes-dates', 'mes-createurs', 'profil', 'reglages', 'suivis',
  'notifications', 'evenement', 'e', 'admin', 'onboarding', 'login', 'auth',
  'legal', 'boutique', 'abonnement',
])

/** Route profil/vitrine public `/:slug` (ou `/:slug/embed`) : premier segment non réservé. */
export function isPublicProfilePath(path: string): boolean {
  const first = path.replace(/^\/+/, '').split('/')[0]
  return first !== '' && !RESERVED_TOP.has(first)
}

/** Une route est valide pour un acteur si elle est dans sa nav, une surface partagée, ou une vitrine publique.
 *  Note : /admin est traité comme valide ici — la véritable garde de rôle est faite par
 *  <AdminRoute> côté React. Si un non-admin y atterrit, AdminRoute le redirige. Sans cette
 *  exception, le useEffect d'AppLayout virait MÊME un admin sur /explorer (car /admin n'est
 *  dans aucune nav). */
export function isRouteValidFor(path: string, actor: { kind: string; entityType: string | null } | null): boolean {
  if (path.startsWith('/admin')) return true
  const navPaths = navItemsFor(actor).map(k => NAV_DEFS[k].to)
  return navPaths.some(p => path.startsWith(p))
    || SHARED_PREFIXES.some(p => path.startsWith(p))
    || isPublicProfilePath(path)
}

/** Lien de la vitrine du propriétaire : sa page publique si elle a un slug, sinon /profil. */
export function vitrineHref(publicSlug: string | null | undefined): string {
  return publicSlug ? `/${publicSlug}` : '/profil'
}

/**
 * Plan effectif de l'acteur actif : le Pro vit sur l'entité, jamais sur la personne.
 * `entityRow` est la ligne de l'acteur actif (UserRow | EntityRow) ; seul EntityRow porte `plan`.
 */
export function planForActor(actor: { kind: string } | null, entityRow: unknown): Plan {
  if (actor?.kind !== 'entity') return 'free'
  const e = entityRow as { plan?: Plan | null; comped_pro_until?: string | null } | null | undefined
  if (e?.plan === 'pro') return 'pro'
  // Pro offert via parrainage (hors Stripe) : actif tant que la date n'est pas passée.
  if (e?.comped_pro_until && new Date(e.comped_pro_until) > new Date()) return 'pro'
  return 'free'
}

/**
 * Une entité est « Certifiée » (badge public) si elle est Pro, OU si `verified` a été posé
 * à la main (override : certifier un compte officiel non-payant, garde-fou anti-usurpation).
 * Dérivation pure → aucune logique back, l'essai (trialing) suit `plan`. Cf. décision 0004.
 */
export function isCertified(entity: { plan?: Plan | string | null; verified?: boolean | null } | null | undefined): boolean {
  return entity?.plan === 'pro' || entity?.verified === true
}

/**
 * Route d'atterrissage après login / onboarding selon l'acteur actif.
 * Une entité Pro atterrit sur son Cockpit ; tout le reste (personne, entité gratuite)
 * sur Explorer (home universelle). Le plan est lu via planForActor (Pro = sur l'entité).
 */
export function defaultRouteForActor(actor: { kind: string } | null, entityRow: unknown): string {
  return planForActor(actor, entityRow) === 'pro' ? '/tableau-de-bord' : '/explorer'
}
