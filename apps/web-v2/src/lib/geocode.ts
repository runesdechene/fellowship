/**
 * QUOI     — les adresses de la Base Adresse Nationale (le service d'adresses de l'État, gratuit,
 *            sans clé) : suggestions pendant la frappe, position d'une commune.
 * POURQUOI — lot 10b (Uriel, 11/10/2026) : une date créée par la V2 doit avoir sa position sur la
 *            carte, comme les 112 de la base. Réécrit pour la V2, sans reprendre le code de la V1.
 * ATTENTION — une BAN qui ne répond pas rend une liste vide ou null : jamais une erreur qui
 *            bloquerait la création.
 */

const BAN = 'https://api-adresse.data.gouv.fr/search/'
/** Une BAN lente ne doit jamais retenir la création : passé ce délai, on fait sans elle. */
const PATIENCE_MS = 3000

export interface PlaceSuggestion {
  label: string
  address: string
  city: string
  department: string
  latitude: number
  longitude: number
}

export function departmentOfCitycode(citycode: string): string {
  return /^9[78]/.test(citycode) ? citycode.slice(0, 3) : citycode.slice(0, 2)
}

type Raw = Record<string, unknown>
const record = (value: unknown): Raw | null =>
  typeof value === 'object' && value !== null ? (value as Raw) : null
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export function readBan(json: unknown): PlaceSuggestion[] {
  const features = record(json)?.features
  if (!Array.isArray(features)) return []
  return features.flatMap((item: unknown) => {
    const feature = record(item)
    const coordinates = record(feature?.geometry)?.coordinates
    const props = record(feature?.properties)
    if (!Array.isArray(coordinates) || !props) return []
    const [longitude, latitude] = coordinates as unknown[]
    const citycode = text(props.citycode)
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !citycode) return []
    return [
      {
        label: text(props.label),
        // Une commune n'a pas d'adresse : son nom est déjà celui de la ville.
        address: props.type === 'municipality' ? '' : text(props.name),
        city: text(props.city),
        department: departmentOfCitycode(citycode),
        latitude,
        longitude,
      },
    ]
  })
}

export function banUrl(query: string, options: { type?: 'municipality'; limit?: number }): string {
  const params = new URLSearchParams({ q: query })
  if (options.limit) params.set('limit', String(options.limit))
  if (options.type) params.set('type', options.type)
  return `${BAN}?${params.toString()}`
}

async function ask(url: string): Promise<PlaceSuggestion[]> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(PATIENCE_MS) })
    if (!response.ok) return []
    return readBan(await response.json())
  } catch {
    return []
  }
}

export function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  return ask(banUrl(query, { limit: 5 }))
}

/** Un département tel qu'on le tape (« 1 », « 2a ») écrit comme la BAN l'écrit (« 01 », « 2A »). */
export function typedDepartment(typed: string): string {
  return typed.trim().toUpperCase().padStart(2, '0')
}

export async function locateCity(
  city: string,
  department: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const found = await ask(banUrl(city, { type: 'municipality', limit: 10 }))
  const match = found.find((place) => place.department === typedDepartment(department))
  return match ? { latitude: match.latitude, longitude: match.longitude } : null
}
