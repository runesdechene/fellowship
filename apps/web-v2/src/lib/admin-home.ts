/**
 * QUOI     — les phrases de l'accueil de l'administration : le titre (« 8 personnes sont venues
 *            cette semaine. »), la ligne sous le titre, et les accords en nombre de ses chiffres.
 * POURQUOI — le titre dit l'état de l'application en une phrase (maquette 2448:233) ; ses accords
 *            se testent sans navigateur.
 */
import { formatWeekdayDayMonth } from './dates'

/** « 8 personnes sont venues cette semaine. » ; une seule, ou personne, s'accordent. */
export function visitorsHeadline(week: number): string {
  if (week === 0) return 'Personne n’est venu cette semaine.'
  if (week === 1) return 'Une personne est venue cette semaine.'
  return `${week} personnes sont venues cette semaine.`
}

/** « Jeudi 22 octobre. 3 aujourd’hui, 21 sur les 30 derniers jours. » */
export function visitorsLine(now: Date, today: number, month: number): string {
  const day = formatWeekdayDayMonth(now)
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}. ${today} aujourd’hui, ${month} sur les 30 derniers jours.`
}

/** « 1 fiche créée », « 3 fiches créées » : le nom et son participe suivent le nombre. */
export function counted(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}
