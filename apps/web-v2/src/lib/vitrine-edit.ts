/**
 * QUOI     — les règles de l'éditeur de vitrine : le brouillon, l'adresse (nettoyée, vérifiée), les
 *            liens (type, libellé), les limites des champs, ce qui a changé, la position de la
 *            bannière glissée.
 * POURQUOI — lot 6b (spec du 11/10/2026) : on modifie la vitrine en place et on publie d'un clic ;
 *            rien de mal formé ne doit partir, et seul ce qui a changé s'écrit. Logique pure,
 *            testée (vitrine-edit.test.ts).
 * ATTENTION — une adresse ne vaut jamais une page de l'application (RESERVED) : la vitrine vit à
 *            la racine (`flw.sh/<adresse>`), elle cacherait la page.
 */
import type { Database } from '@/types/supabase'

export type EntityUpdate = Database['public']['Tables']['entities']['Update']

export type LinkType = 'website' | 'instagram' | 'shop'

// Un alias, pas une interface : il doit rester assignable à `Json` (la colonne `entities.links`).
export type VitrineLink = {
  type: LinkType
  url: string
  label: string
}

export interface VitrineDraft {
  name: string
  craft: string
  city: string
  department: string
  bio: string
  links: VitrineLink[]
  slug: string
  bannerPosition: number
}

export const MAX_LINKS = 3
export const BIO_MAX = 255
export const BIO_COUNTER_FROM = 200

const RESERVED = new Set([
  'communaute',
  'explorer',
  'calendrier',
  'bilans',
  'pro',
  'reglages',
  'evenement',
  'connexion',
  'bienvenue',
  'v2',
  'admin',
  'api',
])

/**
 * « Atelier Corne & Cuir » → « atelier-corne-cuir ». Nettoyée à la frappe : le tiret final reste,
 * sinon on ne pourrait jamais taper « atelier-cuir » ; `slugProblem` le refuse à l'enregistrement.
 */
export function cleanSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
}

export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return 'Au moins 3 caractères'
  if (slug.length > 40) return '40 caractères au plus'
  if (RESERVED.has(slug)) return 'Cette adresse est réservée'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Lettres, chiffres et tirets seulement'
  return null
}

/** Une adresse web, et rien d'autre : un `javascript:` finirait dans un href. */
export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

export function normalizeUrl(raw: string): string {
  const url = raw.trim()
  if (url === '') return ''
  return isWebUrl(url) ? url : `https://${url}`
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function linkType(url: string): LinkType {
  const domain = host(url)
  if (domain === 'instagram.com' || domain.endsWith('.instagram.com')) return 'instagram'
  if (/etsy\.|sumup|shopify|boutique|shop/.test(domain)) return 'shop'
  return 'website'
}

/** « @compte » pour Instagram ; l'hôte sans www (et le chemin) pour le reste. */
export function linkLabel(link: VitrineLink): string {
  try {
    const url = new URL(link.url)
    const path = url.pathname.replace(/\/+$/, '')
    if (link.type === 'instagram') return `@${path.replace(/^\//, '').split('/')[0] ?? ''}`
    return `${url.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return link.url
  }
}

export function fieldProblem(draft: VitrineDraft): string | null {
  const name = draft.name.trim()
  if (name === '') return 'Le nom ne peut pas être vide'
  if (name.length > 60) return 'Le nom : 60 caractères au plus'
  if (draft.craft.trim().length > 60) return 'Le métier : 60 caractères au plus'
  if (draft.city.trim().length > 60) return 'La ville : 60 caractères au plus'
  const department = draft.department.trim()
  if (department !== '' && (department.length < 2 || department.length > 3)) {
    return 'Le département : 2 ou 3 caractères'
  }
  if (draft.bio.length > BIO_MAX) return 'La présentation : 255 caractères au plus'
  return null
}

const empty = (value: string): string | null => (value.trim() === '' ? null : value.trim())

/** Les colonnes de `entities` qui ont changé, prêtes pour l'`update`. */
/** Les liens tels qu'ils se publient : complétés de https://, typés, sans les vides. */
export function cleanLinks(links: VitrineLink[]): VitrineLink[] {
  return links.flatMap((link) => {
    const url = normalizeUrl(link.url)
    if (url === '') return []
    const type = linkType(url)
    return [{ type, url, label: linkLabel({ type, url, label: '' }) }]
  })
}

export function changedColumns(before: VitrineDraft, after: VitrineDraft): EntityUpdate {
  const columns: EntityUpdate = {}
  if (after.name.trim() !== before.name.trim()) columns.brand_name = after.name.trim()
  if (after.craft.trim() !== before.craft.trim()) columns.craft_type = empty(after.craft)
  if (after.city.trim() !== before.city.trim()) columns.city = empty(after.city)
  if (after.department.trim() !== before.department.trim())
    columns.department = empty(after.department)
  if (after.bio.trim() !== before.bio.trim()) columns.bio = empty(after.bio)
  const links = cleanLinks(after.links)
  if (JSON.stringify(links) !== JSON.stringify(cleanLinks(before.links))) {
    columns.links = links
    columns.website = null // le site de la V1 reviendrait sinon comme lien (vitrineLinks)
  }
  if (after.slug !== before.slug) columns.public_slug = after.slug
  if (after.bannerPosition !== before.bannerPosition) columns.banner_position = after.bannerPosition
  return columns
}

/** Glisser la bannière vers le bas montre le haut de l'image : la position (0–100) baisse. */
export function bannerPositionFrom(start: number, dy: number, travel: number): number {
  if (travel <= 0) return start
  return Math.round(Math.min(100, Math.max(0, start - (dy / travel) * 100)))
}

/** L'adresse demandée appartient déjà à une autre vitrine (contrainte unique de la base). */
export function isSlugTaken(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' && (error.message ?? '').includes('public_slug')
}
