// Client Base Adresse Nationale (BAN) — géocodage France, gratuit, sans clé, CORS ouvert.
// Le fetch est injectable pour des tests sans réseau.
const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/'

export type GeocodeResult = {
  label: string
  city: string
  postcode: string
  citycode: string // code INSEE (France uniquement, '' à l'étranger)
  department?: string // libellé région/canton (étranger). En France, dérivé du citycode.
  country?: string // code pays ISO minuscule, ex. 'fr', 'ch'
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
    country: 'fr',
    lat,
    lng,
    score: p.score ?? 0,
  }
}

const PHOTON_SEARCH = 'https://photon.komoot.io/api/'

type PhotonFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: {
    name?: string; street?: string; housenumber?: string
    city?: string; postcode?: string; state?: string; county?: string
    country?: string; countrycode?: string
  }
}

// Pure : feature Photon -> GeocodeResult. Photon n'a pas de score ; on le dérive du rang.
export function parsePhotonFeature(f: PhotonFeature, rank = 0): GeocodeResult {
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties
  const line = [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || ''
  const place = [p.postcode, p.city].filter(Boolean).join(' ')
  const label = [line, place, p.country].filter(Boolean).join(', ')
  return {
    label,
    city: p.city ?? p.name ?? '',
    postcode: p.postcode ?? '',
    citycode: '',
    department: p.state ?? p.county ?? '',
    country: (p.countrycode ?? '').toLowerCase(),
    lat,
    lng,
    score: Math.max(0, 1 - rank * 0.1),
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

// Autocomplete BAN (France). Privé.
async function searchBan(query: string, fetchFn: typeof fetch): Promise<GeocodeResult[]> {
  try {
    const res = await fetchFn(`${BAN_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map(parseBanFeature)
  } catch {
    return []
  }
}

// Autocomplete Photon (mondial). Privé.
async function searchPhoton(query: string, fetchFn: typeof fetch): Promise<GeocodeResult[]> {
  try {
    const res = await fetchFn(`${PHOTON_SEARCH}?q=${encodeURIComponent(query)}&limit=5`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map((f: PhotonFeature, i: number) => parsePhotonFeature(f, i))
  } catch {
    return []
  }
}

// Dédoublonne par coordonnées arrondies (garde la 1re occurrence = BAN prioritaire).
function dedupeResults(rs: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>()
  const out: GeocodeResult[] = []
  for (const r of rs) {
    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

// Autocomplete : BAN (France, précis) en tête + Photon (mondial) ensuite.
export async function searchAddresses(q: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const query = q.trim()
  if (query.length < 3) return []
  const [ban, photon] = await Promise.all([
    searchBan(query, fetchFn),
    searchPhoton(query, fetchFn),
  ])
  return dedupeResults([...ban, ...photon])
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
