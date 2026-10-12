/**
 * QUOI     — la distance à vol d'oiseau entre deux points, son libellé (« 800 m », « 12,5 km »,
 *            « 142 km »), et le point d'une fiche.
 * POURQUOI — lot 13 : « à 142 km de ton atelier ». Calculée dans le navigateur : ni le siège ni la
 *            position de la personne ne partent ailleurs.
 */

export interface Point {
  latitude: number
  longitude: number
}

const EARTH_KM = 6371
const radians = (degrees: number) => (degrees * Math.PI) / 180

/** À vol d'oiseau (formule de haversine). */
export function distanceKm(a: Point, b: Point): number {
  const dLat = radians(b.latitude - a.latitude)
  const dLng = radians(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${String(Math.round(km * 100) * 10)} m`
  if (km < 100) return `${(Math.round(km * 10) / 10).toLocaleString('fr-FR')} km`
  return `${String(Math.round(km))} km`
}

/** Le point d'une fiche ; une fiche sans position n'en a pas. */
export function eventPoint(event: {
  latitude: number | null
  longitude: number | null
}): Point | null {
  return event.latitude === null || event.longitude === null
    ? null
    : { latitude: event.latitude, longitude: event.longitude }
}
