/**
 * QUOI     — tests de lib/regions.ts : la région d'un département.
 * POURQUOI — le fil d'Ariane d'une fiche nomme la région (décision du 23/10/2026).
 */
import { regionOf, zoneOf, zoneSlug } from './regions'

describe('regionOf', () => {
  it('donne la région d’un département de métropole', () => {
    expect(regionOf('63')).toBe('Auvergne-Rhône-Alpes')
    expect(regionOf('35')).toBe('Bretagne')
    expect(regionOf(' 75 ')).toBe('Île-de-France')
  })

  it('reconnaît la Corse et l’outre-mer', () => {
    expect(regionOf('2a')).toBe('Corse')
    expect(regionOf('2B')).toBe('Corse')
    expect(regionOf('974')).toBe('La Réunion')
  })

  it('lit les formes saisies en base : un code postal, un numéro entre parenthèses', () => {
    expect(regionOf('04100')).toBe('Provence-Alpes-Côte d’Azur')
    expect(regionOf('88000')).toBe('Grand Est')
    expect(regionOf('Puy-de-Dôme (63)')).toBe('Auvergne-Rhône-Alpes')
    expect(regionOf('97410')).toBe('La Réunion')
  })

  it('ne devine pas un département inconnu', () => {
    expect(regionOf('Drôme')).toBeNull()
    expect(regionOf('1700 (CH)')).toBeNull()
    expect(regionOf('')).toBeNull()
    expect(regionOf(null)).toBeNull()
    expect(regionOf('99')).toBeNull()
  })
})

describe('zoneOf', () => {
  it('donne la région d’une fiche française', () => {
    expect(zoneOf({ country: 'FR', department: '83' })).toBe('Provence-Alpes-Côte d’Azur')
  })

  it('donne le pays d’une fiche hors de France, quel que soit son canton', () => {
    expect(zoneOf({ country: 'CH', department: 'Fribourg' })).toBe('Suisse')
    expect(zoneOf({ country: 'BE', department: null })).toBe('Belgique')
  })

  it('ne devine rien sans département ni pays connu', () => {
    expect(zoneOf({ country: 'FR', department: null })).toBeNull()
    expect(zoneOf({ country: 'XX', department: 'Ailleurs' })).toBeNull()
  })
})

describe('zoneSlug', () => {
  it('écrit une zone en adresse', () => {
    expect(zoneSlug('Île-de-France')).toBe('ile-de-france')
    expect(zoneSlug('Provence-Alpes-Côte d’Azur')).toBe('provence-alpes-cote-d-azur')
    expect(zoneSlug('Suisse')).toBe('suisse')
  })
})
