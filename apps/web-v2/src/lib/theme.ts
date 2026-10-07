/**
 * QUOI     — le thème de l'interface : le choix retenu sur l'appareil (clair ou sombre), ou à
 *            défaut le réglage de l'appareil ; et sa pose sur la page (`<html data-theme>`).
 * POURQUOI — la nuit se règle en CSS sur `:root[data-theme='dark']` (2-semantic.css) ; poser
 *            l'attribut avant le premier rendu évite un éclair du mauvais thème.
 * ATTENTION — le choix vit dans le stockage de l'appareil (un confort, pas une donnée) : chaque
 *            accès est protégé, une navigation privée retombe sur le réglage de l'appareil.
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'flw-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Ne retient qu'un choix valide. */
export function readThemeChoice(raw: string | null): Theme | null {
  return raw === 'light' || raw === 'dark' ? raw : null
}

/** Le choix explicite l'emporte ; sans lui, on suit l'appareil. */
export function resolveTheme(choice: Theme | null, prefersDark: boolean): Theme {
  return choice ?? (prefersDark ? 'dark' : 'light')
}

export function storedThemeChoice(): Theme | null {
  try {
    return readThemeChoice(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function storeThemeChoice(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* stockage indisponible : le choix vaut pour la visite */
  }
}

export function deviceTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/** Le thème à afficher maintenant. */
export function currentTheme(): Theme {
  return resolveTheme(storedThemeChoice(), deviceTheme() === 'dark')
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Suit le réglage de l'appareil tant qu'aucun choix n'a été fait. Rend de quoi arrêter. */
export function followDevice(onChange: (theme: Theme) => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  const listener = () => {
    if (storedThemeChoice() === null) onChange(deviceTheme())
  }
  query.addEventListener('change', listener)
  return () => {
    query.removeEventListener('change', listener)
  }
}
