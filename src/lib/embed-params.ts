export type EmbedView = 'mini' | 'full'
export type EmbedTheme = 'light' | 'dark' | 'auto'

export interface EmbedParams {
  view: EmbedView
  theme: EmbedTheme
  max: number
  accent: string
  /** Largeur max du contenu en px ; null = pleine largeur du parent (100%). */
  maxWidth: number | null
}

const DEFAULT_MAX: Record<EmbedView, number> = { mini: 4, full: 10 }

export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const view: EmbedView = params.get('view') === 'mini' ? 'mini' : 'full'

  const themeRaw = params.get('theme')
  const theme: EmbedTheme =
    themeRaw === 'dark' ? 'dark' : themeRaw === 'auto' ? 'auto' : 'light'

  const maxRaw = parseInt(params.get('max') ?? '', 10)
  const max = Number.isFinite(maxRaw)
    ? Math.min(Math.max(maxRaw, 1), 50)
    : DEFAULT_MAX[view]

  const accentRaw = params.get('accent') ?? ''
  const accent = /^[0-9a-fA-F]{3,8}$/.test(accentRaw) ? `#${accentRaw}` : '#c87941'

  // Largeur : `maxw` explicite (clampé) sinon défaut par vue — mini cadré à 360px,
  // full en pleine largeur du parent (null → 100%).
  const maxwRaw = parseInt(params.get('maxw') ?? '', 10)
  const maxWidth = Number.isFinite(maxwRaw)
    ? Math.min(Math.max(maxwRaw, 240), 2000)
    : view === 'mini' ? 360 : null

  return { view, theme, max, accent, maxWidth }
}
