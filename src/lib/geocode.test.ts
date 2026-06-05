import { describe, it, expect } from 'vitest'
import {
  parseBanFeature,
  parsePhotonFeature,
  filterByDepartment,
  departmentFromCitycode,
  searchAddresses,
  geocodeCity,
} from './geocode'

const feature = (over: Record<string, unknown> = {}) => ({
  geometry: { coordinates: [2.3488, 48.8534] as [number, number] }, // [lng, lat]
  properties: { label: 'Paris', city: 'Paris', postcode: '75000', citycode: '75056', score: 0.9, ...over },
})

describe('parseBanFeature', () => {
  it('mappe [lng, lat] GeoJSON vers lat/lng (inversion correcte)', () => {
    const r = parseBanFeature(feature())
    expect(r.lat).toBe(48.8534)
    expect(r.lng).toBe(2.3488)
    expect(r.city).toBe('Paris')
    expect(r.citycode).toBe('75056')
  })
})

describe('filterByDepartment', () => {
  const mk = (citycode: string, score: number) => ({ citycode, score, label: '', city: '', postcode: '', lat: 0, lng: 0 })
  it('garde les citycodes du département, triés par score décroissant', () => {
    const out = filterByDepartment([mk('75056', 0.8), mk('77288', 0.9), mk('77001', 0.95)], '77')
    expect(out.map(r => r.citycode)).toEqual(['77001', '77288'])
  })
  it('renvoie tout si département vide', () => {
    expect(filterByDepartment([mk('75056', 1)], '')).toHaveLength(1)
  })
})

describe('departmentFromCitycode', () => {
  it('2 chiffres en métropole', () => expect(departmentFromCitycode('75056')).toBe('75'))
  it('3 chiffres pour les DOM (97x/98x)', () => expect(departmentFromCitycode('97123')).toBe('971'))
  it('gère la Corse 2A/2B', () => expect(departmentFromCitycode('2A004')).toBe('2A'))
})

describe('searchAddresses', () => {
  it('renvoie [] sous 3 caractères (sans fetch)', async () => {
    const r = await searchAddresses('ab', (() => { throw new Error('no fetch') }) as unknown as typeof fetch)
    expect(r).toEqual([])
  })
  it('parse les features BAN', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [feature()] }) })) as unknown as typeof fetch
    const r = await searchAddresses('paris', fakeFetch)
    expect(r).toHaveLength(1)
    expect(r[0].lat).toBe(48.8534)
  })
  it('renvoie [] sur erreur réseau', async () => {
    const fakeFetch = (async () => { throw new Error('boom') }) as unknown as typeof fetch
    expect(await searchAddresses('paris', fakeFetch)).toEqual([])
  })
})

describe('geocodeCity', () => {
  it('désambiguïse les homonymes par département', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [
      feature({ city: 'Saint-Ours', citycode: '63100', score: 0.5 }),
      feature({ city: 'Saint-Ours', citycode: '73100', score: 0.4 }),
    ] }) })) as unknown as typeof fetch
    const r = await geocodeCity('Saint-Ours', '73', fakeFetch)
    expect(r?.citycode).toBe('73100')
  })
  it('renvoie null si aucune feature', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ features: [] }) })) as unknown as typeof fetch
    expect(await geocodeCity('Nowhere', '99', fakeFetch)).toBeNull()
  })
})

const photonFeature = (props: Record<string, unknown> = {}) => ({
  geometry: { coordinates: [7.1620, 46.8065] as [number, number] }, // [lng, lat] = Fribourg CH
  properties: { name: 'Fribourg', city: 'Fribourg', postcode: '1700', state: 'Fribourg', countrycode: 'CH', ...props },
})

describe('parsePhotonFeature', () => {
  it('inverse [lng, lat] et mappe ville/postcode/pays', () => {
    const r = parsePhotonFeature(photonFeature())
    expect(r.lat).toBe(46.8065)
    expect(r.lng).toBe(7.1620)
    expect(r.city).toBe('Fribourg')
    expect(r.postcode).toBe('1700')
    expect(r.country).toBe('ch') // minuscule
    expect(r.citycode).toBe('') // pas d'INSEE hors France
  })
  it('département = state pour l’étranger', () => {
    expect(parsePhotonFeature(photonFeature()).department).toBe('Fribourg')
  })
  it('label avec numéro + rue quand présents', () => {
    const r = parsePhotonFeature(photonFeature({ housenumber: '12', street: 'Rue de Lausanne' }))
    expect(r.label).toContain('12 Rue de Lausanne')
    expect(r.label).toContain('1700 Fribourg')
  })
  it('score décroît avec le rang', () => {
    expect(parsePhotonFeature(photonFeature(), 0).score).toBeGreaterThan(parsePhotonFeature(photonFeature(), 3).score)
  })
})
