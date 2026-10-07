export type Theme = 'night' | 'day'

export const THEME_STORAGE_KEY = 'flwsh-theme'

/** Le choix persisté s'il est valide. Sinon on lit la décision déjà prise
 *  avant le premier paint par le script anti-flash d'index.html : le DOM est
 *  la source de cette décision, la ré-inventer ici ferait diverger les deux
 *  et produirait un scintillement au montage. Sans classe = nuit, le défaut
 *  historique de l'app. */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'night'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'day' || stored === 'night') return stored
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
    return 'day'
  }
  return 'night'
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
