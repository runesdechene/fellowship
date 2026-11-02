/**
 * QUOI     — tests de poster-category.ts : la catégorie et le dessin d'une affiche absente.
 * POURQUOI — les tags mêlent noms et slugs ; une catégorie inconnue doit tomber sur « Autre ».
 */
import { expect, test } from 'vitest'
import { posterCategory, posterMotif } from './poster-category'

test('posterCategory : par nom ou par slug, sans casse', () => {
  expect(posterCategory(['Médiéval'])).toBe('fete-medievale')
  expect(posterCategory(['fete-medievale'])).toBe('fete-medievale')
  expect(posterCategory(['GEEK'])).toBe('geek')
  expect(posterCategory(['Metal'])).toBe('festival-metal')
})

test('posterCategory : la première connue, « autre » sinon', () => {
  expect(posterCategory(['inconnue', 'Geek', 'Médiéval'])).toBe('geek')
  expect(posterCategory(['biker'])).toBe('autre')
  expect(posterCategory(['cinema'])).toBe('autre')
  expect(posterCategory([])).toBe('autre')
  expect(posterCategory(null)).toBe('autre')
})

test('posterMotif : chaque catégorie a son dessin', () => {
  const names = ['Médiéval', 'Metal', 'Marché de créateurs', 'Gastronomique', 'Autre']
  for (const name of names) expect(posterMotif(posterCategory([name]))).toBeTruthy()
  expect(posterMotif('cinema')).toBeUndefined()
})
