/**
 * QUOI     — les règles de l'arrivée d'un exposant : les étapes selon le cas, la validité de chaque
 *            étape, l'adresse tirée de la marque, le département d'un code postal, l'arrondi des
 *            chiffres du mur de connexion, les initiales, les chiffres d'un code collé.
 * POURQUOI — lot 10a (Uriel, 11/10/2026) : la marque d'abord, puis le prénom. Les écrans
 *            affichent ; ce qui se décide se teste ici.
 */
import { cleanSlug, slugProblem } from './vitrine-edit'

export type WelcomeStep = 'brand' | 'firstName' | 'craft' | 'place' | 'address'
export type WelcomeKind = 'new' | 'nameOnly' | 'newEntity'

const STEPS: Record<WelcomeKind, WelcomeStep[]> = {
  new: ['brand', 'firstName', 'craft', 'place', 'address'],
  nameOnly: ['firstName'],
  newEntity: ['brand', 'craft', 'place', 'address'],
}

export function welcomeSteps(kind: WelcomeKind): WelcomeStep[] {
  return STEPS[kind]
}

export interface WelcomeDraft {
  brand: string
  firstName: string
  craft: string
  city: string
  postalCode: string
  slug: string
  slugTouched: boolean
  referral: string
}

export const EMPTY_DRAFT: WelcomeDraft = {
  brand: '',
  firstName: '',
  craft: '',
  city: '',
  postalCode: '',
  slug: '',
  slugTouched: false,
  referral: '',
}

const MAX_TEXT = 60

function tooLong(value: string): string | null {
  return value.trim().length > MAX_TEXT ? `${String(MAX_TEXT)} caractères au plus` : null
}

export function slugFor(draft: WelcomeDraft): string {
  return draft.slugTouched ? draft.slug : cleanSlug(draft.brand.trim()).replace(/-$/, '')
}

export function stepProblem(step: WelcomeStep, draft: WelcomeDraft): string | null {
  switch (step) {
    case 'brand':
      return draft.brand.trim() === '' ? 'Le nom de ta marque' : tooLong(draft.brand)
    case 'firstName':
      return draft.firstName.trim() === '' ? 'Ton prénom' : tooLong(draft.firstName)
    case 'craft':
      return tooLong(draft.craft)
    case 'place': {
      const postal = draft.postalCode.trim()
      if (postal !== '' && !/^\d{5}$/.test(postal)) return 'Cinq chiffres'
      return tooLong(draft.city)
    }
    case 'address':
      return slugProblem(slugFor(draft))
  }
}

/** « 63000 » → « 63 » ; la Corse en 2A / 2B, les outre-mer sur trois chiffres. */
export function departmentOf(postalCode: string): string | null {
  const postal = postalCode.trim()
  if (!/^\d{5}$/.test(postal)) return null
  if (postal.startsWith('20')) return Number(postal) < 20200 ? '2A' : '2B'
  if (postal.startsWith('97') || postal.startsWith('98')) return postal.slice(0, 3)
  return postal.slice(0, 2)
}

/** Les chiffres du mur : exacts sous 10, à la dizaine sous 1 000, à la centaine au-delà. */
export function wallCount(n: number): number {
  if (n < 10) return n
  if (n < 1000) return Math.floor(n / 10) * 10
  return Math.floor(n / 100) * 100
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function codeDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, 6)
}
