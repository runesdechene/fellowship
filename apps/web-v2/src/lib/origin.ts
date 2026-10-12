/**
 * QUOI     — le point de départ d'une distance : l'atelier de l'enseigne active, sinon la position que
 *            la personne a donnée, sinon rien.
 * POURQUOI — lot 13 (Uriel, 12/10/2026) : « à 142 km de ton atelier » ; une enseigne nomade, ou un
 *            compte personnel, passe par « Depuis ma position ».
 */
import { distanceKm, formatDistance, type Point } from '@/lib/distance'

export type Origin =
  | { kind: 'base'; point: Point; label: 'Ton atelier' }
  | { kind: 'position'; point: Point; label: 'Ta position' }
  | { kind: 'none' }

export function originFor(
  activeEntityId: string | null,
  bases: Map<string, Point>,
  position: Point | null,
): Origin {
  const base = activeEntityId ? bases.get(activeEntityId) : undefined
  if (base) return { kind: 'base', point: base, label: 'Ton atelier' }
  if (position) return { kind: 'position', point: position, label: 'Ta position' }
  return { kind: 'none' }
}

/** « À 142 km de ton atelier », « À 12,5 km de ta position » — ou rien sans point de départ. */
export function distanceSentence(point: Point, origin: Origin): string | null {
  if (origin.kind === 'none') return null
  const distance = formatDistance(distanceKm(origin.point, point))
  return origin.kind === 'base' ? `À ${distance} de ton atelier` : `À ${distance} de ta position`
}
