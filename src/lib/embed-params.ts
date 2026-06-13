export type EmbedTheme = 'light' | 'dark' | 'auto'

export interface EmbedParams {
  theme: EmbedTheme
  /** Nombre max d'événements ; null = tous (défaut, comme la Vitrine). */
  max: number | null
  accent: string
  /** Largeur max du contenu en px ; null = pleine largeur du parent (100%). */
  maxWidth: number | null
  /** Nb de dates visibles avant « Voir plus » ; 0 = tout afficher (pas de repli). Défaut 4. */
  preview: number
  /** Affiche l'en-tête identité (avatar + nom + description) ; `header=0` le masque. */
  showHeader: boolean
}

export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const themeRaw = params.get('theme')
  const theme: EmbedTheme =
    themeRaw === 'dark' ? 'dark' : themeRaw === 'auto' ? 'auto' : 'light'

  // `max` explicite → clampé [1,50]. Sinon : tous (null), comme la Vitrine.
  const maxRaw = parseInt(params.get('max') ?? '', 10)
  const max = Number.isFinite(maxRaw) ? Math.min(Math.max(maxRaw, 1), 50) : null

  const accentRaw = params.get('accent') ?? ''
  const accent = /^[0-9a-fA-F]{3,8}$/.test(accentRaw) ? `#${accentRaw}` : '#c87941'

  // `maxw` explicite (clampé) = plafond optionnel ; sinon fluide (null → 100% du parent).
  const maxwRaw = parseInt(params.get('maxw') ?? '', 10)
  const maxWidth = Number.isFinite(maxwRaw)
    ? Math.min(Math.max(maxwRaw, 240), 2000)
    : null

  // Repli : `preview` dates visibles avant « Voir plus » (clampé [0,50]) ; défaut 4. 0 = tout afficher.
  const previewRaw = parseInt(params.get('preview') ?? '', 10)
  const preview = Number.isFinite(previewRaw) ? Math.min(Math.max(previewRaw, 0), 50) : 4

  // En-tête identité affiché sauf `header=0`.
  const showHeader = params.get('header') !== '0'

  return { theme, max, accent, maxWidth, preview, showHeader }
}
