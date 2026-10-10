/**
 * QUOI     — tests de l'icône d'une catégorie.
 * POURQUOI — `events.tags` mêle des noms (V2) et des slugs (V1), en casses variées : une affiche
 *            absente doit retrouver son icône dans tous les cas, et retomber sur l'étiquette.
 */
import { Castle, Gamepad2, Tag, TreePine } from 'lucide-react'
import { expect, test } from 'vitest'
import { categoryIcon, firstCategory } from './category-icons'

test('par le nom ou par le slug, sans souci de casse', () => {
  expect(categoryIcon(['Médiéval'])).toBe(Castle)
  expect(categoryIcon(['fete-medievale'])).toBe(Castle)
  expect(categoryIcon(['GEEK'])).toBe(Gamepad2)
  expect(categoryIcon(['marche-noel'])).toBe(TreePine)
})

test('la première catégorie connue l’emporte', () => {
  expect(categoryIcon(['inconnue', 'Geek', 'Médiéval'])).toBe(Gamepad2)
})

test('sans catégorie connue : l’étiquette', () => {
  expect(categoryIcon(['biker'])).toBe(Tag)
  expect(categoryIcon([])).toBe(Tag)
  expect(categoryIcon(null)).toBe(Tag)
})

test('firstCategory : la catégorie qui colore l’affiche', () => {
  expect(firstCategory(['inconnue', 'geek'])).toBe('geek')
  expect(firstCategory(['inconnue'])).toBeNull()
  expect(firstCategory(null)).toBeNull()
})
