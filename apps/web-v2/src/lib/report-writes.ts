/**
 * QUOI     — les règles d'écriture d'un bilan : sens de chaque catégorie, la catégorie « Recettes
 *            chiffrées », le chiffrement d'office d'un nouveau bilan, l'invitation à choisir une
 *            phrase, ajout d'une étiquette, ce que « Supprimer ce bilan » efface.
 * POURQUOI — logique pure, testée seule ; le hook useReport ne fait qu'appliquer.
 * ATTENTION — « Supprimer ce bilan » ne supprime JAMAIS la ligne event_reports : la cascade
 *            emporterait la ligne « stepper », le prix de la place saisi dans Mon dossier.
 */
import type { LedgerCategory } from '@/types/database'
import type { SecretRevenue } from './cipher'

export const CATEGORIES = [
  { value: 'ventes', label: 'Ventes', direction: 'in' },
  { value: 'remboursement', label: 'Remboursement', direction: 'in' },
  { value: 'cachet', label: 'Cachet', direction: 'in' },
  { value: 'emplacement', label: 'Emplacement', direction: 'out' },
  { value: 'essence', label: 'Essence', direction: 'out' },
  { value: 'peage', label: 'Péage', direction: 'out' },
  { value: 'hebergement', label: 'Hébergement', direction: 'out' },
  { value: 'repas', label: 'Repas', direction: 'out' },
  { value: 'autre', label: 'Autre', direction: 'out' },
] as const satisfies readonly { value: LedgerCategory; label: string; direction: 'in' | 'out' }[]

/** Pas une ligne du registre : elle ouvre le chiffrement de Carte et Espèces (Ledger). */
export const SECRET_CATEGORY = { value: 'chiffrees', label: 'Recettes chiffrées' } as const

/** Les catégories de la ligne d'ajout : sur une date chiffrée, une recette passe par Carte et Espèces. */
export function addableCategories(encrypted: boolean) {
  return encrypted ? CATEGORIES.filter((entry) => entry.direction === 'out') : CATEGORIES
}

/**
 * Une date sans recette saisie en clair et pas encore chiffrée, d'une enseigne qui a sa phrase : elle
 * se présente avec Carte et Espèces, et le premier montant la scelle. Les dates qui ont des recettes
 * en clair restent telles quelles, et se chiffrent une par une.
 */
export function encryptsByDefault(
  secret: 'none' | 'masked' | 'open',
  lines: readonly { direction: 'in' | 'out'; source: string }[],
  keyStatus: 'none' | 'locked' | 'open',
): boolean {
  if (secret !== 'none' || keyStatus === 'none') return false
  return !lines.some((line) => line.direction === 'in' && line.source === 'manual')
}

/**
 * Où inviter à chiffrer : le bandeau de Mes bilans tant que l'enseigne n'a ni phrase ni refus, la
 * carte des Réglages après « Garder en clair ». Rien tant que l'existence d'une phrase n'est pas lue.
 */
export function revenueInvitation(
  ready: boolean,
  keyStatus: 'none' | 'locked' | 'open',
  clearChosen: boolean,
): 'banner' | 'settings' | null {
  if (!ready || keyStatus !== 'none') return null
  return clearChosen ? 'settings' : 'banner'
}

/**
 * Carte ou Espèces changée : l'autre part vient de ce que la base garde à l'instant de l'écriture
 * (null : rien n'est encore scellé, on part de zéro), jamais de l'écran.
 */
export function mergeRevenue(
  current: SecretRevenue | null,
  part: keyof SecretRevenue,
  amount: number,
): SecretRevenue {
  return { ...(current ?? { carte: 0, especes: 0 }), [part]: amount }
}

export function directionOf(category: LedgerCategory): 'in' | 'out' {
  return CATEGORIES.find((entry) => entry.value === category)?.direction ?? 'out'
}

export function categoryLabel(category: LedgerCategory): string {
  return CATEGORIES.find((entry) => entry.value === category)?.label ?? 'Autre'
}

/** Ce que « Supprimer ce bilan » efface : les lignes saisies dans le bilan, et son contenu. */
export function clearReportPlan(reportId: string) {
  return {
    deleteLines: { report_id: reportId, source: 'manual' as const },
    resetReport: {
      wins: [] as string[],
      improvements: [] as string[],
      note: null,
      media_paths: [] as string[],
    },
  }
}

/** Ajoute une étiquette nettoyée ; le vide et les doublons (sans la casse) ne changent rien. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim()
  if (tag === '') return tags
  const exists = tags.some((t) => t.toLocaleLowerCase('fr') === tag.toLocaleLowerCase('fr'))
  return exists ? tags : [...tags, tag]
}

/** Retire une étiquette ; déjà absente, rien ne change. */
export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag)
}
