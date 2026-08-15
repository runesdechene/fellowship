// src/lib/landing-v2.ts
// L'interrupteur de la VITRINE. La mécanique vit dans v2-switch.ts ; ce module
// n'est plus qu'un nommage stable (clé + paramètre) pour ne pas casser les
// appelants ni les tests existants.
import { resolveV2Switch, readV2Switch, type V2Decision } from './v2-switch'

export const LANDING_V2_STORAGE_KEY = 'flwsh-landing-v2'
export const LANDING_V2_PARAM = 'v2'

export type LandingV2Decision = V2Decision

export function resolveLandingV2(search: string, stored: string | null): LandingV2Decision {
  return resolveV2Switch(LANDING_V2_PARAM, search, stored)
}

export function readLandingV2(): boolean {
  return readV2Switch(LANDING_V2_PARAM, LANDING_V2_STORAGE_KEY)
}
