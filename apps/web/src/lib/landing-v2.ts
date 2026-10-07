export const LANDING_V2_STORAGE_KEY = 'flwsh-landing-v2'

export interface LandingV2Decision {
  /** Faut-il rendre la V2 ? */
  enabled: boolean
  /** Valeur à écrire en mémoire, ou null pour l'effacer. */
  persist: '1' | null
}

/** L'interrupteur, en pur : `?v2=1` allume et mémorise, `?v2=0` éteint et oublie,
 *  sinon on relit la mémoire. Défaut : V1. */
export function resolveLandingV2(search: string, stored: string | null): LandingV2Decision {
  const param = new URLSearchParams(search).get('v2')
  if (param === '1') return { enabled: true, persist: '1' }
  if (param === '0') return { enabled: false, persist: null }
  return stored === '1' ? { enabled: true, persist: '1' } : { enabled: false, persist: null }
}

/** Lit l'interrupteur côté navigateur et applique l'effet de mémoire. */
export function readLandingV2(): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(LANDING_V2_STORAGE_KEY)
  const { enabled, persist } = resolveLandingV2(window.location.search, stored)
  if (persist) window.localStorage.setItem(LANDING_V2_STORAGE_KEY, persist)
  else window.localStorage.removeItem(LANDING_V2_STORAGE_KEY)
  return enabled
}
