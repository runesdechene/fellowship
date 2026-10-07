// src/lib/onboarding.ts
export type OnboardingPath = 'festivalier' | 'exposant'

/** Pourquoi on arrive sur l'onboarding : première inscription vs compte existant
 * qui ajoute une casquette exposant (depuis le sélecteur d'entités). */
export type OnboardingIntent = 'first-run' | 'add-exposant'

export interface OnboardingFlow {
  case: 'completion' | 'festivalier' | 'exposant' | 'add-entity'
  needsChoice: boolean
  createsEntity: boolean
  steps: string[]
}

/** Slug/handle : minuscules, sans accents, [^a-z0-9] → tirets, trim. */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Code département FR depuis le code postal (Corse 2A/2B, DOM 3 chiffres). null si invalide. */
export function deriveDepartment(postalCode: string): string | null {
  const cp = (postalCode || '').trim()
  if (!/^\d{5}$/.test(cp)) return null
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3) // DOM/TOM
  if (cp.startsWith('20')) return parseInt(cp, 10) < 20200 ? '2A' : '2B' // Corse
  return cp.slice(0, 2)
}

/** Détermine le parcours selon le nb d'entités existantes, le choix de l'utilisateur,
 * et l'intention d'arrivée. */
export function resolveOnboardingFlow(
  entityCount: number,
  chosenPath: OnboardingPath | null,
  intent: OnboardingIntent = 'first-run',
): OnboardingFlow {
  // Compte EXISTANT qui ajoute une casquette exposant : flux dédié qui ne touche
  // JAMAIS la personne (pas d'étape prénom). Prioritaire sur tout le reste — sinon
  // le court-circuit `entityCount > 0` (completion) ou le défaut `choice` (qui écrase
  // la personne) reprendraient la main et casseraient « Créer un compte exposant ».
  if (intent === 'add-exposant') {
    return { case: 'add-entity', needsChoice: false, createsEntity: true, steps: ['brand', 'craft', 'location', 'slug'] }
  }
  if (entityCount > 0) {
    return { case: 'completion', needsChoice: false, createsEntity: false, steps: ['name'] }
  }
  if (chosenPath === 'festivalier') {
    return { case: 'festivalier', needsChoice: false, createsEntity: false, steps: ['name', 'postal'] }
  }
  if (chosenPath === 'exposant') {
    return { case: 'exposant', needsChoice: false, createsEntity: true, steps: ['name', 'brand', 'craft', 'location', 'slug'] }
  }
  return { case: 'festivalier', needsChoice: true, createsEntity: false, steps: ['choice'] }
}

/** Handle perso unique : slugify(base), suffixe compteur si pris. `isTaken` injecté (testable). */
export async function resolveUniqueHandle(base: string, isTaken: (handle: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'membre'
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`
    if (!(await isTaken(candidate))) return candidate
  }
  return `${root}-${Date.now()}`
}
