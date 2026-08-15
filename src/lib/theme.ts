export type Theme = 'night' | 'day'

export const THEME_STORAGE_KEY = 'flwsh-theme'

/**
 * Le thème d'ouverture, en pur. Trois états, pas deux :
 *  - un choix explicite mémorisé  → il est roi, partout ;
 *  - aucun choix, en V2           → JOUR (le parchemin est l'identité, décision 0007) ;
 *  - aucun choix, en V1           → NUIT (le défaut historique de l'app).
 * `hasLightClass` reflète la décision déjà prise avant le premier paint par le
 * script anti-flash d'index.html : le DOM est la source de cette décision, la
 * ré-inventer ici ferait diverger les deux et produirait un scintillement.
 */
export function resolveInitialTheme(stored: string | null, hasLightClass: boolean, isV2: boolean): Theme {
  if (stored === 'day' || stored === 'night') return stored
  if (hasLightClass) return 'day'
  return isV2 ? 'day' : 'night'
}

export function getInitialTheme(isV2 = false): Theme {
  if (typeof window === 'undefined') return 'night'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  const hasLightClass = typeof document !== 'undefined'
    && document.documentElement.classList.contains('light')
  return resolveInitialTheme(stored, hasLightClass, isV2)
}

/**
 * Pose l'habillage : jour = classe `.light` sur <html>, nuit = aucune classe.
 * NE PERSISTE RIEN — appelé à chaque rendu du provider. Persister ici écrivait
 * un choix que l'utilisateur n'avait jamais fait, et une visite V2 imposait
 * alors le clair à toute la V1.
 */
export function applyThemeClass(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('light', theme === 'day')
  }
}

/** Mémorise un choix EXPLICITE de l'utilisateur. Le seul appelant légitime est un geste. */
export function persistTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}
