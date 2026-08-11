export type Theme = 'night' | 'day'

export const THEME_STORAGE_KEY = 'flwsh-theme'

/** Nuit par défaut (DA « Nuit de Festival »). Lit le choix persisté s'il est valide. */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'night'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'day' || stored === 'night' ? stored : 'night'
}

/** Applique le thème : jour = classe `.light` sur <html> ; nuit = aucune classe (défaut). Persiste. */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('light', theme === 'day')
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}

/** Un choix de thème explicitement persisté par l'utilisateur. Tout le reste
 *  (absence de clé, valeur inconnue) veut dire « il n'a jamais choisi ». */
export function hasExplicitThemeChoice(stored: string | null): boolean {
  return stored === 'day' || stored === 'night'
}
