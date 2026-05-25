import { useCallback, useEffect, useState } from 'react'
import { type Theme, getInitialTheme, applyTheme } from '@/lib/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'night' ? 'day' : 'night')),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
