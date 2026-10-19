/**
 * QUOI     — le calendrier intégré (`/:slug/embed`) : lire ses réglages dans l'adresse, et choisir
 *            les dates qu'il montre.
 * POURQUOI — l'adresse est collée sur le site d'un artiste, parfois retouchée à la main : chaque
 *            réglage a un défaut et des bornes, et rien de ce qu'on y écrit ne casse le calendrier.
 * ATTENTION — les réglages reprennent ceux de la V1 à l'identique (lot 12) : des milliers de
 *            visiteurs voient des calendriers déjà collés, leur adresse ne change pas.
 */
import { parseSqlDate } from './dates'

export type EmbedTheme = 'light' | 'dark' | 'auto'

export interface EmbedParams {
  theme: EmbedTheme
  /** Nombre de dates au plus ; null = toutes. */
  max: number | null
  /** La couleur du rond de l'initiale, quand l'enseigne n'a pas de logo. */
  accent: string
  /** Largeur au plus, en px ; null = toute la largeur du site hôte. */
  maxWidth: number | null
  /** Dates visibles avant « Voir les autres » ; 0 = toutes. */
  preview: number
  showHeader: boolean
}

const DEFAULT_ACCENT = '#c87941'

function clampedInt(raw: string | null, min: number, max: number): number | null {
  const value = parseInt(raw ?? '', 10)
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : null
}

export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const theme = params.get('theme')
  const accent = params.get('accent') ?? ''
  return {
    theme: theme === 'dark' || theme === 'auto' ? theme : 'light',
    max: clampedInt(params.get('max'), 1, 50),
    accent: /^[0-9a-fA-F]{3,8}$/.test(accent) ? `#${accent}` : DEFAULT_ACCENT,
    maxWidth: clampedInt(params.get('maxw'), 240, 2000),
    preview: clampedInt(params.get('preview'), 0, 50) ?? 4,
    showHeader: params.get('header') !== '0',
  }
}

/** Les dates publiques à venir (aujourd'hui compris), de la plus proche à la plus lointaine. */
export function upcomingEmbedDates<T extends { start_date: string; is_private: boolean }>(
  rows: T[],
  today: Date,
  max: number | null,
): T[] {
  const list = rows
    .filter((row) => !row.is_private && parseSqlDate(row.start_date) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  return max === null ? list : list.slice(0, max)
}
