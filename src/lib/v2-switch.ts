// src/lib/v2-switch.ts
// L'interrupteur V1/V2, en pur. Un paramètre d'URL allume et mémorise, `=0`
// éteint et oublie, sinon on relit la mémoire. Défaut : V1.
// Généralisé depuis landing-v2.ts pour servir la vitrine ET l'app, avec des
// clés distinctes : allumer l'une n'allume pas l'autre.

export interface V2Decision {
  /** Faut-il rendre la V2 ? */
  enabled: boolean
  /** Valeur à écrire en mémoire, ou null pour l'effacer. */
  persist: '1' | null
}

export const APP_V2_PARAM = 'app2'
export const APP_V2_STORAGE_KEY = 'flwsh-app-v2'

export function resolveV2Switch(param: string, search: string, stored: string | null): V2Decision {
  const value = new URLSearchParams(search).get(param)
  if (value === '1') return { enabled: true, persist: '1' }
  if (value === '0') return { enabled: false, persist: null }
  return stored === '1' ? { enabled: true, persist: '1' } : { enabled: false, persist: null }
}

/** Lit l'interrupteur côté navigateur et applique l'effet de mémoire. */
export function readV2Switch(param: string, storageKey: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(storageKey)
  const { enabled, persist } = resolveV2Switch(param, window.location.search, stored)
  if (persist) window.localStorage.setItem(storageKey, persist)
  else window.localStorage.removeItem(storageKey)
  return enabled
}
