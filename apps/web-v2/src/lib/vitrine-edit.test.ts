/**
 * QUOI     — tests des règles de l'éditeur de vitrine : l'adresse, les liens, ce qui a changé, la
 *            position de la bannière.
 * POURQUOI — l'adresse d'une vitrine finit sur des QR codes et des sites : une adresse réservée ou
 *            mal formée ne doit jamais partir, et seul ce qui a changé s'écrit.
 */
import { describe, expect, test } from 'vitest'
import {
  bannerPositionFrom,
  changedColumns,
  cleanSlug,
  fieldProblem,
  isSlugTaken,
  linkLabel,
  linkType,
  normalizeUrl,
  slugProblem,
  type VitrineDraft,
} from './vitrine-edit'

const draft: VitrineDraft = {
  name: 'Runes de Chêne',
  craft: 'Marque de vêtement',
  city: 'Clermont-Ferrand',
  department: '63',
  bio: 'Rendre au monde sa mémoire.',
  links: [{ type: 'website', url: 'https://runesdechene.com', label: 'runesdechene.com' }],
  slug: 'runesdechene',
  bannerPosition: 50,
}

describe('cleanSlug', () => {
  test.each([
    ['Atelier Corne & Cuir', 'atelier-corne-cuir'],
    [' --Éla--  ', 'ela'],
    ['Runes_de Chêne', 'runes-de-chene'],
    ['déjà--vu', 'deja-vu'],
  ])('%s → %s', (raw, expected) => {
    expect(cleanSlug(raw)).toBe(expected)
  })
})

describe('slugProblem', () => {
  test('trop court, trop long, réservé, mal formé', () => {
    expect(slugProblem('ab')).toBe('Au moins 3 caractères')
    expect(slugProblem('a'.repeat(41))).toBe('40 caractères au plus')
    expect(slugProblem('communaute')).toBe('Cette adresse est réservée')
    expect(slugProblem('v2')).toBe('Au moins 3 caractères')
    expect(slugProblem('reglages')).toBe('Cette adresse est réservée')
    expect(slugProblem('a_b-c')).toBe('Lettres, chiffres et tirets seulement')
    expect(slugProblem('-abc')).toBe('Lettres, chiffres et tirets seulement')
  })
  test('une adresse valide', () => {
    expect(slugProblem('runes-de-chene')).toBeNull()
  })
})

describe('les liens', () => {
  test('normalizeUrl ajoute https:// s’il manque', () => {
    expect(normalizeUrl(' runesdechene.com ')).toBe('https://runesdechene.com')
    expect(normalizeUrl('http://x.fr')).toBe('http://x.fr')
    expect(normalizeUrl('')).toBe('')
  })
  test('normalizeUrl ne garde tel quel que http(s) : le reste devient un nom de site', () => {
    expect(normalizeUrl('javascript://x')).toBe('https://javascript://x')
    expect(normalizeUrl('ftp://x.fr')).toBe('https://ftp://x.fr')
  })
  test.each([
    ['https://instagram.com/runesdechene', 'instagram'],
    ['https://www.instagram.com/runesdechene/', 'instagram'],
    ['https://www.etsy.com/shop/runes', 'shop'],
    ['https://la-bete.sumupstore.com/', 'shop'],
    ['https://runes.myshopify.com', 'shop'],
    ['https://runesdechene.com', 'website'],
  ])('linkType(%s) → %s', (url, type) => {
    expect(linkType(url)).toBe(type)
  })
  test('linkLabel', () => {
    expect(
      linkLabel({ type: 'instagram', url: 'https://instagram.com/runesdechene/', label: '' }),
    ).toBe('@runesdechene')
    expect(linkLabel({ type: 'website', url: 'https://www.runesdechene.com/', label: '' })).toBe(
      'runesdechene.com',
    )
    expect(linkLabel({ type: 'shop', url: 'https://www.etsy.com/shop/runes', label: '' })).toBe(
      'etsy.com/shop/runes',
    )
  })
})

describe('fieldProblem', () => {
  test('un brouillon valide', () => {
    expect(fieldProblem(draft)).toBeNull()
  })
  test('les limites', () => {
    expect(fieldProblem({ ...draft, name: '  ' })).toBe('Le nom ne peut pas être vide')
    expect(fieldProblem({ ...draft, name: 'a'.repeat(61) })).toBe('Le nom : 60 caractères au plus')
    expect(fieldProblem({ ...draft, bio: 'a'.repeat(256) })).toBe(
      'La présentation : 255 caractères au plus',
    )
    expect(fieldProblem({ ...draft, department: '6' })).toBe('Le département : 2 ou 3 caractères')
    expect(fieldProblem({ ...draft, department: '' })).toBeNull()
  })
})

describe('changedColumns', () => {
  test('rien n’a changé', () => {
    expect(changedColumns(draft, { ...draft })).toEqual({})
  })
  test('seul ce qui a changé s’écrit', () => {
    expect(changedColumns(draft, { ...draft, name: 'Runes' })).toEqual({ brand_name: 'Runes' })
    expect(changedColumns(draft, { ...draft, bio: '' })).toEqual({ bio: null })
    expect(changedColumns(draft, { ...draft, slug: 'runes', bannerPosition: 30 })).toEqual({
      public_slug: 'runes',
      banner_position: 30,
    })
  })
  test('les liens comparés par contenu', () => {
    const same = { ...draft, links: draft.links.map((link) => ({ ...link })) }
    expect(changedColumns(draft, same)).toEqual({})
    const more = {
      ...draft,
      links: [
        ...draft.links,
        { type: 'instagram' as const, url: 'https://instagram.com/x', label: '@x' },
      ],
    }
    expect(Object.keys(changedColumns(draft, more))).toEqual(['links'])
  })
})

test('bannerPositionFrom : glisser vers le bas montre le haut, borné', () => {
  expect(bannerPositionFrom(50, 40, 200)).toBe(30)
  expect(bannerPositionFrom(50, -40, 200)).toBe(70)
  expect(bannerPositionFrom(10, 400, 200)).toBe(0)
  expect(bannerPositionFrom(90, -400, 200)).toBe(100)
  expect(bannerPositionFrom(50, 40, 0)).toBe(50)
})

test('isSlugTaken : seulement le doublon d’adresse', () => {
  expect(
    isSlugTaken({
      code: '23505',
      message: 'duplicate key value violates unique constraint "entities_public_slug_key"',
    }),
  ).toBe(true)
  expect(isSlugTaken({ code: '23505', message: 'autre contrainte' })).toBe(false)
  expect(isSlugTaken({ code: '42501', message: 'entities_public_slug_key' })).toBe(false)
  expect(isSlugTaken(null)).toBe(false)
})
