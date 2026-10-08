/**
 * QUOI     — les règles d'écriture d'un bilan : sens de chaque catégorie, ajout d'une étiquette,
 *            ce que « Supprimer ce bilan » efface.
 * POURQUOI — logique pure, testée seule ; le hook useReport ne fait qu'appliquer.
 * ATTENTION — « Supprimer ce bilan » ne supprime JAMAIS la ligne event_reports : la cascade
 *            emporterait la ligne « stepper », le prix de la place saisi dans Mon dossier.
 */
import type { LedgerCategory } from '@/types/database'

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
