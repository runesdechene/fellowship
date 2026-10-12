/**
 * QUOI     — tests de l'histoire d'une fiche : la phrase d'une version, son auteur, son titre, et la
 *            comparaison avec la précédente.
 * POURQUOI — lot 10c : « L'histoire de la fiche » doit dire en une phrase ce que chacun a changé, et
 *            montrer mot à mot ce qu'il a ajouté ou retiré.
 */
import { describe, expect, test } from 'vitest'
import {
  authorName,
  changeBlocks,
  versionSentence,
  versionTitle,
  versionWhen,
} from './event-history'

describe('versionSentence', () => {
  test('origine, un champ, deux, plusieurs ; les dates comptent une fois ; la position ne se dit pas', () => {
    expect(versionSentence([], true)).toBe('a ajouté l’événement')
    expect(versionSentence(['image_url'], false)).toBe('a changé l’affiche')
    expect(versionSentence(['registration_deadline', 'registration_note'], false)).toBe(
      'a changé la date limite et « Comment candidater »',
    )
    expect(versionSentence(['address', 'end_date', 'latitude', 'start_date'], false)).toBe(
      'a changé l’adresse et les dates',
    )
    expect(versionSentence(['name', 'city', 'tags'], false)).toBe(
      'a changé le nom, la ville et les catégories',
    )
    expect(versionSentence(['latitude', 'longitude'], false)).toBe('a modifié la fiche')
  })
})

describe('authorName', () => {
  test('prénom et enseigne, prénom seul, compte supprimé', () => {
    expect(authorName('Lina', 'L’Atelier Sauvage')).toBe('Lina de L’Atelier Sauvage')
    expect(authorName('Lina', null)).toBe('Lina')
    expect(authorName(null, null)).toBe('Un compte supprimé')
  })
})

test('versionTitle', () => {
  expect(versionTitle(new Date(2026, 9, 9, 14))).toBe('La version du 9 octobre')
})

describe('changeBlocks', () => {
  test('un champ court : avant → après, une date en toutes lettres', () => {
    expect(
      changeBlocks([{ field: 'registration_deadline', before: null, after: '2026-08-15' }]),
    ).toEqual([
      {
        field: 'registration_deadline',
        label: 'Date limite d’inscription',
        kind: 'short',
        before: null,
        after: '15 août 2026',
      },
    ])
  })
  test('les catégories en liste, la position cachée', () => {
    const blocks = changeBlocks([
      { field: 'tags', before: ['Marché'], after: ['Marché', 'Musique'] },
      { field: 'latitude', before: 1, after: 2 },
    ])
    expect(blocks).toEqual([
      {
        field: 'tags',
        label: 'Catégories',
        kind: 'short',
        before: 'Marché',
        after: 'Marché, Musique',
      },
    ])
  })
  test('un champ vide avant comme après n’a pas de bloc (la version d’origine)', () => {
    expect(
      changeBlocks([
        { field: 'address', before: null, after: null },
        { field: 'registration_note', before: null, after: null },
        { field: 'city', before: null, after: 'Riom' },
      ]),
    ).toEqual([{ field: 'city', label: 'Ville', kind: 'short', before: null, after: 'Riom' }])
  })
  test('la description mot à mot, du HTML lu en texte', () => {
    const [block] = changeBlocks([
      {
        field: 'description',
        before: '<p>Un village viking</p>',
        after: '<p>Un village pirate</p>',
      },
    ])
    expect(block).toMatchObject({ kind: 'text', label: 'Description' })
    if (block?.kind !== 'text') throw new Error('attendu : un texte')
    expect(block.parts.filter((p) => p.removed).map((p) => p.text.trim())).toEqual(['viking'])
    expect(block.parts.filter((p) => p.added).map((p) => p.text.trim())).toEqual(['pirate'])
  })
})

describe('versionWhen', () => {
  const now = new Date(2026, 9, 12, 15)
  test('aujourd’hui, hier, il y a N jours, puis la date', () => {
    expect(versionWhen(new Date(2026, 9, 12, 9), now)).toBe('aujourd’hui')
    expect(versionWhen(new Date(2026, 9, 11, 22), now)).toBe('hier')
    expect(versionWhen(new Date(2026, 9, 9, 10), now)).toBe('il y a 3 jours')
    expect(versionWhen(new Date(2026, 8, 12, 10), now)).toBe('12 septembre')
    expect(versionWhen(new Date(2025, 5, 18, 10), now)).toBe('18 juin 2025')
  })
})
