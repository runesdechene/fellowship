/**
 * QUOI     — tests de la réduction d'image : la taille cible, et le refus d'un fichier inutilisable.
 * POURQUOI — une photo de téléphone de 10 Mo ne doit pas partir telle quelle sur une vitrine ; un
 *            fichier qui n'est pas une image ne doit jamais partir.
 */
import { describe, expect, test } from 'vitest'
import { fitWithin, imageProblem } from './image-resize'

describe('fitWithin', () => {
  test('une image déjà petite ne grandit pas', () => {
    expect(fitWithin(400, 300, 512)).toEqual({ width: 400, height: 300 })
  })
  test('une image large se réduit en gardant ses proportions', () => {
    expect(fitWithin(4000, 1000, 2000)).toEqual({ width: 2000, height: 500 })
  })
  test('un portrait se borne par sa largeur', () => {
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 512, height: 683 })
  })
})

describe('imageProblem', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'photo', { type })
  test('une image raisonnable passe', () => {
    expect(imageProblem(file('image/jpeg', 4_000_000))).toBeNull()
  })
  test('pas une image, ou trop lourde', () => {
    expect(imageProblem(file('application/pdf', 1000))).toBe(
      'Cette image ne peut pas être utilisée.',
    )
    expect(imageProblem(file('image/png', 16_000_000))).toBe(
      'Cette image ne peut pas être utilisée.',
    )
  })
})
