import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Theme, getInitialTheme, applyThemeClass, persistTheme } from '@/lib/theme'
import { readV2Switch, APP_V2_PARAM, APP_V2_STORAGE_KEY } from '@/lib/v2-switch'

interface ThemeContextValue {
  theme: Theme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `isV2` est lu une seule fois, au montage : l'interrupteur ne change pas
  // en cours de visite, et il a déjà été résolu par le script anti-flash.
  const [theme, setThemeState] = useState<Theme>(
    () => getInitialTheme(readV2Switch(APP_V2_PARAM, APP_V2_STORAGE_KEY)),
  )

  // Pose la classe à chaque changement. Ne mémorise RIEN : voir lib/theme.ts.
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  // Les deux seuls chemins qui mémorisent — ils partent d'un geste de l'utilisateur.
  const setTheme = useCallback((next: Theme) => {
    persistTheme(next)
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next: Theme = t === 'night' ? 'day' : 'night'
      persistTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
