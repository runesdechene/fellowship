/**
 * QUOI     — tests de la distance à vol d'oiseau et de son libellé.
 * POURQUOI — lot 13 : « à 142 km de ton atelier » doit être juste, et une fiche sans position ne doit
 *            jamais afficher « NaN km ».
 */
import { describe, expect, test } from 'vitest'
import { distanceKm, eventPoint, formatDistance } from './distance'

const clermont = { latitude: 45.7772, longitude: 3.087 }
const lyon = { latitude: 45.764, longitude: 4.8357 }

describe('distanceKm', () => {
  test('Clermont-Ferrand → Lyon, à vol d’oiseau', () => {
    expect(Math.round(distanceKm(clermont, lyon))).toBe(136)
  })
  test('un même point est à zéro', () => {
    expect(distanceKm(lyon, lyon)).toBe(0)
  })
})

describe('formatDistance', () => {
  test('mètres sous 1 km, une décimale sous 100 km, ronds au-delà', () => {
    expect(formatDistance(0.8)).toBe('800 m')
    expect(formatDistance(0.04)).toBe('40 m')
    expect(formatDistance(12.46)).toBe('12,5 km')
    expect(formatDistance(142.4)).toBe('142 km')
  })
})

describe('eventPoint', () => {
  test('une fiche sans position n’a pas de point', () => {
    expect(eventPoint({ latitude: null, longitude: 3 })).toBeNull()
    expect(eventPoint({ latitude: 45, longitude: 3 })).toEqual({ latitude: 45, longitude: 3 })
  })
})
