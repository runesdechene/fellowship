/**
 * One-time script: géocode les événements existants sans coordonnées.
 * Pour chaque event où latitude is null, géocode city+department via la BAN
 * (centre-ville) et écrit latitude/longitude/geo_precision='city'.
 *
 * Usage: node scripts/backfill-geocode.mjs
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) dans .env
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx), line.slice(idx + 1)]
    })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY)
const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/'

async function geocodeCity(city, department) {
  if (!city?.trim()) return null
  const res = await fetch(`${BAN_SEARCH}?q=${encodeURIComponent(city.trim())}&type=municipality&limit=5`)
  if (!res.ok) return null
  const data = await res.json()
  const results = (data.features ?? []).map(f => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    citycode: f.properties.citycode ?? '',
    score: f.properties.score ?? 0,
  }))
  const dep = (department ?? '').trim()
  const filtered = dep ? results.filter(r => r.citycode.startsWith(dep)).sort((a, b) => b.score - a.score) : results
  return filtered[0] ?? results[0] ?? null
}

async function main() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, city, department')
    .is('latitude', null)
  if (error) throw error
  console.log(`${events.length} événement(s) à géocoder.`)

  let ok = 0
  let miss = 0
  for (const ev of events) {
    const c = await geocodeCity(ev.city, ev.department)
    if (!c) {
      console.warn(`✗ ${ev.name} (${ev.city}, ${ev.department}) — aucun résultat`)
      miss++
      continue
    }
    const { error: upErr } = await supabase
      .from('events')
      .update({ latitude: c.lat, longitude: c.lng, geo_precision: 'city' })
      .eq('id', ev.id)
    if (upErr) {
      console.warn(`✗ ${ev.name} — update échoué: ${upErr.message}`)
      miss++
    } else {
      console.log(`✓ ${ev.name} -> ${c.lat}, ${c.lng}`)
      ok++
    }
    await new Promise(r => setTimeout(r, 100)) // courtoisie BAN
  }
  console.log(`\nTerminé : ${ok} géocodés, ${miss} sans résultat.`)
}

main().catch(e => { console.error(e); process.exit(1) })
