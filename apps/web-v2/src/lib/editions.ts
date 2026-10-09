/**
 * QUOI     — les éditions d'un festival : quel semblable peut être l'édition précédente.
 * POURQUOI — à la création d'une date, un festival semblable DÉJÀ PASSÉ peut être « l'édition
 *            d'avant » (lot 8b, 09/10/2026) ; un semblable à venir est plutôt un doublon.
 */
import { parseSqlDate } from './dates'

export function canBePreviousEdition(startDate: string, today: Date): boolean {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return parseSqlDate(startDate) < day
}
