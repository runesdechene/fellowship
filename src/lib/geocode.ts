// Client Base Adresse Nationale (BAN) — géocodage France, gratuit, sans clé, CORS ouvert.
// Le fetch est injectable pour des tests sans réseau.
const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/'

export type GeocodeResult = {
  label: string
  city: string
  postcode: string
  citycode: string // code INSEE
  lat: number
  lng: number
  score: number
}

type BanFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: { label?: string; city?: string; postcode?: string; citycode?: string; score?: number }
}

// Pure : feature GeoJSON BAN -> GeocodeResult. BAN renvoie [lng, lat], on inverse.
export function parseBanFeature(f: BanFeature): GeocodeResult {
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties
  return {
    label: p.label ?? '',
    city: p.city ?? '',
    postcode: p.postcode ?? '',
    citycode: p.citycode ?? '',
    lat,
    lng,
    score: p.score ?? 0,
  }
}

// Pure : département (2 chiffres, 3 pour les DOM, 2A/2B pour la Corse) depuis un code INSEE.
export function departmentFromCitycode(citycode: string): string {
  if (/^9[78]/.test(citycode)) return citycode.slice(0, 3)
  return citycode.slice(0, 2)
}

// Pure : ne garde que les résultats du département, triés par score décroissant.
export function filterByDepartment(results: GeocodeResult[], department: string): GeocodeResult[] {
  const dep = department.trim()
  if (!dep) return results
  return results
    .filter(r => r.citycode.startsWith(dep))
    .sort((a, b) => b.score - a.score)
}

// Autocomplete : adresses correspondant à la requête (>= 3 caractères).
export async function searchAddresses(q: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const query = q.trim()
  if (query.length < 3) return []
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map(parseBanFeature)
  } catch {
    return []
  }
}

// Fallback centre-ville : géocode une commune, désambiguïsée par département.
export async function geocodeCity(city: string, department: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult | null> {
  const c = city.trim()
  if (!c) return null
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(c)}&type=municipality&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const results: GeocodeResult[] = (data.features ?? []).map(parseBanFeature)
    const filtered = filterByDepartment(results, department)
    return filtered[0] ?? results[0] ?? null
  } catch {
    return null
  }
}
