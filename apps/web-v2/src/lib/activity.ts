/**
 * QUOI     — la logique pure du fil « Activité du réseau » : fusionner les sources du plus récent
 *            au plus ancien (l'âge d'un événement se dit dans dates.ts : timeAgo).
 * POURQUOI — le fil mêle des arrivées, des inscriptions, des abonnements et des festivals
 *            ajoutés ; leur ordre se teste seul (activity.test.ts).
 */

/** Les sources du fil, mêlées du plus récent au plus ancien, coupées à `limit`. */
export function mergeFeed<T extends { occurredAt: Date }>(sources: T[][], limit: number): T[] {
  return sources
    .flat()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit)
}
