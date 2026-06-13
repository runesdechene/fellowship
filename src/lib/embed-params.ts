export type EmbedView = 'mini' | 'full'
export type EmbedTheme = 'light' | 'dark' | 'auto'

export interface EmbedParams {
  view: EmbedView
  theme: EmbedTheme
  /** Nombre max d'événements ; null = tous (défaut en pleine page, comme la vitrine). */
  max: number | null
  accent: string
  /** Largeur max du contenu en px ; null = pleine largeur du parent (100%). */
  maxWidth: number | null
}

export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const view: EmbedView = params.get('view') === 'mini' ? 'mini' : 'full'

  const themeRaw = params.get('theme')
  const theme: EmbedTheme =
    themeRaw === 'dark' ? 'dark' : themeRaw === 'auto' ? 'auto' : 'light'

  const maxRaw = parseInt(params.get('max') ?? '', 10)
  // `max` explicite → clampé [1,50]. Sinon : mini cadré à 4, full = TOUS (null) comme la vitrine.
  const max = Number.isFinite(maxRaw)
    ? Math.min(Math.max(maxRaw, 1), 50)
    : view === 'mini' ? 4 : null

  const accentRaw = params.get('accent') ?? ''
  const accent = /^[0-9a-fA-F]{3,8}$/.test(accentRaw) ? `#${accentRaw}` : '#c87941'

  // Largeur : `maxw` explicite (clampé) = plafond optionnel. Sinon, mini ET full sont
  // fluides (null → 100% du parent) : l'hôte contraint la largeur via son propre conteneur.
  const maxwRaw = parseInt(params.get('maxw') ?? '', 10)
  const maxWidth = Number.isFinite(maxwRaw)
    ? Math.min(Math.max(maxwRaw, 240), 2000)
    : null

  return { view, theme, max, accent, maxWidth }
}
