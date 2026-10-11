/**
 * QUOI     — tests des adresses : lecture d'une réponse de la Base Adresse Nationale, département
 *            d'un code INSEE, adresse de recherche.
 * POURQUOI — lot 10b : une position fausse met un festival au mauvais endroit de la carte.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { banUrl, departmentOfCitycode, readBan, searchPlaces } from './geocode'

describe('departmentOfCitycode', () => {
  test('deux chiffres, la Corse en lettres, les outre-mer sur trois', () => {
    expect(departmentOfCitycode('63113')).toBe('63')
    expect(departmentOfCitycode('06088')).toBe('06')
    expect(departmentOfCitycode('2A004')).toBe('2A')
    expect(departmentOfCitycode('97411')).toBe('974')
  })
})

describe('readBan', () => {
  const feature = {
    geometry: { coordinates: [3.0863, 45.7772] },
    properties: {
      label: '1 Place de Jaude 63000 Clermont-Ferrand',
      name: '1 Place de Jaude',
      city: 'Clermont-Ferrand',
      citycode: '63113',
    },
  }
  test('une adresse : son libellé, sa rue, sa ville, son département, sa position', () => {
    expect(readBan({ features: [feature] })).toEqual([
      {
        label: '1 Place de Jaude 63000 Clermont-Ferrand',
        address: '1 Place de Jaude',
        city: 'Clermont-Ferrand',
        department: '63',
        latitude: 45.7772,
        longitude: 3.0863,
      },
    ])
  })
  test('ce qui est mal formé est ignoré, jamais une erreur', () => {
    expect(readBan(null)).toEqual([])
    expect(readBan({ features: [{ geometry: {}, properties: {} }] })).toEqual([])
  })
})

describe('banUrl', () => {
  test('encode la recherche, limite et type facultatifs', () => {
    expect(banUrl('Salle d’Arc & Co', { limit: 5 })).toBe(
      'https://api-adresse.data.gouv.fr/search/?q=Salle+d%E2%80%99Arc+%26+Co&limit=5',
    )
    expect(banUrl('Ménétrol', { type: 'municipality', limit: 10 })).toContain('&type=municipality')
  })
})

describe('une BAN qui ne répond pas', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('on n’attend pas plus de trois secondes : la recherche rend une liste vide', async () => {
    // Une BAN qui accepte la connexion mais ne répond jamais : seul l'abandon la fait céder.
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('abandon')))
      })
    })
    await expect(searchPlaces('place de jaude')).resolves.toEqual([])
  }, 4500)
})
