/**
 * QUOI     — les règles de l'arrivée d'un exposant : les étapes selon le cas, la validité de chaque
 *            étape, la phrase du code de parrainage, l'adresse tirée de la marque, le département
 *            d'un code postal, l'arrondi des chiffres du mur de connexion, les initiales, les
 *            chiffres d'un code collé.
 * POURQUOI — lot 10a (Uriel, 11/10/2026) : la marque d'abord, puis le prénom. Sept étapes depuis
 *            le 21/10/2026 (spec 2026-10-21-arrivee-sept-etapes) : la photo et la bannière avant
 *            la création, les festivals puis les exposants après. Les écrans affichent ; ce qui se
 *            décide se teste ici.
 */
import { cleanSlug, slugProblem } from './vitrine-edit'

export type WelcomeStep =
  'brand' | 'firstName' | 'craft' | 'place' | 'address' | 'design' | 'people' | 'festivals'
export type WelcomeKind = 'new' | 'nameOnly' | 'newEntity'

const STEPS: Record<WelcomeKind, WelcomeStep[]> = {
  new: ['brand', 'firstName', 'craft', 'place', 'address', 'design', 'festivals', 'people'],
  nameOnly: ['firstName'],
  newEntity: ['brand', 'craft', 'place', 'address', 'design', 'festivals', 'people'],
}

/** L'enseigne se crée en quittant cette étape ; les suivantes travaillent sur l'enseigne créée. */
export const CREATION_STEP: WelcomeStep = 'design'

export function welcomeSteps(kind: WelcomeKind): WelcomeStep[] {
  return STEPS[kind]
}

export function isAfterCreation(steps: WelcomeStep[], index: number): boolean {
  const creation = steps.indexOf(CREATION_STEP)
  return creation !== -1 && index > creation
}

export interface WelcomeDraft {
  brand: string
  firstName: string
  craft: string
  city: string
  postalCode: string
  /** Pas d'atelier fixe : la ville devient `NOMAD_CITY`, sans code postal. */
  nomad: boolean
  slug: string
  slugTouched: boolean
  referral: string
  /** L'enseigne créée : un retour en arrière ou un nouvel essai n'en crée pas une seconde. */
  createdId: string | null
}

export const EMPTY_DRAFT: WelcomeDraft = {
  brand: '',
  firstName: '',
  craft: '',
  city: '',
  postalCode: '',
  nomad: false,
  slug: '',
  slugTouched: false,
  referral: '',
  createdId: null,
}

/** La ville d'une enseigne nomade : l'emplacement public de sa vitrine, modifiable ensuite. */
export const NOMAD_CITY = 'Entreprise nomade'

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
      if (draft.nomad) return null
      const postal = draft.postalCode.trim()
      if (postal !== '' && !/^\d{5}$/.test(postal)) return 'Cinq chiffres'
      return tooLong(draft.city)
    }
    case 'address':
      return slugProblem(slugFor(draft))
    case 'design':
    case 'people':
    case 'festivals':
      return null
  }
}

/** Que faire d'un brouillon qui porte déjà une enseigne créée, quand on se trouve à une étape
 *  d'avant la création : `reset` si le compte connaît déjà cette enseigne (une arrivée finie ou
 *  quittée, dont le brouillon est resté en session), `resume` sinon (un retour arrière dans la même
 *  arrivée : on reprend aux festivals, rien de ce qui précède ne se modifie plus). */
export function draftFate(
  steps: WelcomeStep[],
  index: number,
  createdId: string | null,
  knownIds: readonly string[],
): 'keep' | 'resume' | 'reset' {
  if (!createdId || !steps.includes(CREATION_STEP) || isAfterCreation(steps, index)) return 'keep'
  return knownIds.includes(createdId) ? 'reset' : 'resume'
}

export type ExhibitorReason = 'festivals' | 'craft' | 'nearby' | 'recent'

const REASONS: Record<Exclude<ExhibitorReason, 'festivals'>, string> = {
  craft: 'Même métier',
  nearby: 'Près de chez toi',
  recent: 'Nouveau sur Fellowship',
}

/** Pourquoi un exposant est proposé : les festivals en commun d'abord (Uriel, 21/10/2026 : « un
 *  fest sert à croiser les gens »), puis le métier, la région, et à défaut les nouveaux venus. */
export function exhibitorReason(reason: ExhibitorReason, shared: number): string {
  if (reason !== 'festivals') return REASONS[reason]
  return `${String(shared)} festival${shared > 1 ? 's' : ''} en commun`
}

/** La note du code de parrainage : `owner` vaut `undefined` tant que rien n'est vérifié, `null`
 *  pour un code inconnu. Le gain est celui du filleul : un essai Pro de 30 jours au lieu de 14. */
export function referralNote(
  code: string,
  owner: string | null | undefined,
): { text: string; tone: 'free' | 'problem' | null } {
  if (code === '' || owner === undefined) {
    return { text: 'Le parrain et toi gagnez un mois de Pro.', tone: null }
  }
  if (owner === null) return { text: 'Aucun code de parrainage trouvé.', tone: 'problem' }
  return {
    text: `✓ Code de ${owner} : ton essai Pro passe à 30 jours si tu l’actives dans tes réglages.`,
    tone: 'free',
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

/** La première étape encore invalide (un lien vers l'étape 5 ouvert dans un nouvel onglet arrive
 *  sans marque ni prénom), ou null si tout est bon. */
export function firstProblemStep(steps: WelcomeStep[], draft: WelcomeDraft): number | null {
  const at = steps.findIndex((step) => stepProblem(step, draft) !== null)
  return at === -1 ? null : at
}

/** Le code après une frappe dans la case `index` : un chiffre s'y écrit, à la place de celui qui y
 *  était ; plusieurs chiffres d'un coup (le code proposé par iOS ou le clavier) remplissent tout. */
export function typedCode(value: string, index: number, raw: string): string {
  // `raw` contient encore le chiffre déjà présent dans la case : on ne garde que le nouveau.
  const digits = codeDigits(raw.replace(value[index] ?? '', ''))
  if (digits === '') return value
  if (digits.length > 1) return digits
  return value.slice(0, index) + digits + value.slice(index + 1)
}

/** `?retour=` n'accepte qu'une adresse de l'app, jamais un autre site. */
export function safeReturn(value: string | null): string | null {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

/** La connexion qui ramène où l'on était : « Crée ton compte gratuit pour les lire » revient sur
 *  la fiche (lot 11b). La route /connexion relit `retour` par safeReturn. */
export function loginReturning(path: string): string {
  return `/connexion?retour=${encodeURIComponent(path)}`
}
