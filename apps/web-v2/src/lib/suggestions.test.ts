/**
 * QUOI     — tests de la lecture des suggestions et de leurs phrases.
 * POURQUOI — la raison s'affiche sur le tableau de bord ET part sur le téléphone (send-push en
 *            recopie le fichier) : une faute de français y serait partout.
 */
import { describe, expect, test } from 'vitest'
import { foundLabel, readSuggestions, reasonInSentence, reasonText, withDe } from './suggestions'

describe('withDe', () => {
  test.each([
    ['Les Médiévales de Provins', 'des Médiévales de Provins'],
    ['Le Grand Marché', 'du Grand Marché'],
    ['La Foire aux Sorcières', 'de la Foire aux Sorcières'],
    ['L’Isle sur la Sorgue', 'de l’Isle sur la Sorgue'],
    ['Arbor Pagan Fest', 'd’Arbor Pagan Fest'],
    ['Élixir Fest', 'd’Élixir Fest'],
    ['Sylak', 'de Sylak'],
  ])('%s → %s', (name, expected) => {
    expect(withDe(name)).toBe(expected)
  })
})

describe('reasonText', () => {
  test('un ami seul', () => {
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 0 })).toBe('Gautier y va')
  })
  test('un ami et d’autres', () => {
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 2 })).toBe(
      'Gautier et 2 amis y vont',
    )
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 1 })).toBe(
      'Gautier et 1 ami y vont',
    )
  })
  test('proche d’un festival', () => {
    expect(reasonText({ kind: 'similar', refName: 'Les Aventuriales' })).toBe(
      'Proche des Aventuriales',
    )
  })
  test('près de chez toi', () => {
    expect(reasonText({ kind: 'near' })).toBe('Près de chez toi')
  })
})

test('dans une phrase, seul un prénom garde sa majuscule', () => {
  expect(reasonInSentence({ kind: 'similar', refName: 'Sylak' })).toBe('proche de Sylak')
  expect(reasonInSentence({ kind: 'near' })).toBe('près de chez toi')
  expect(reasonInSentence({ kind: 'friends', friendName: 'Lina', others: 0 })).toBe('Lina y va')
})

test('foundLabel', () => {
  expect(foundLabel(1)).toBe('J’ai trouvé 1 festival fait pour toi')
  expect(foundLabel(7)).toBe('J’ai trouvé 7 festivals faits pour toi')
})

describe('readSuggestions', () => {
  const item = {
    event_id: 'e1',
    name: 'Fête des Remparts',
    city: 'Dinan',
    start_date: '2027-07-12',
    end_date: '2027-07-13',
    image_url: null,
    reason: { kind: 'similar', ref_name: 'Les Médiévales de Provins' },
  }

  test('lit le nombre et les cartes', () => {
    expect(readSuggestions({ count: 4, items: [item] })).toEqual({
      count: 4,
      items: [
        {
          eventId: 'e1',
          name: 'Fête des Remparts',
          city: 'Dinan',
          startDate: '2027-07-12',
          endDate: '2027-07-13',
          imageUrl: null,
          reason: { kind: 'similar', refName: 'Les Médiévales de Provins' },
        },
      ],
    })
  })

  test('une carte mal formée est ignorée, pas le bloc', () => {
    const broken = { ...item, event_id: 'e2', reason: { kind: 'inconnu' } }
    const nameless = { ...item, event_id: 'e3', name: '' }
    expect(readSuggestions({ count: 3, items: [item, broken, nameless] }).items).toHaveLength(1)
  })

  test('les espaces autour d’un nom saisi sont retirées', () => {
    const padded = { ...item, reason: { kind: 'similar', ref_name: 'Sylak ' } }
    expect(readSuggestions({ count: 1, items: [padded] }).items[0]?.reason).toEqual({
      kind: 'similar',
      refName: 'Sylak',
    })
  })

  test('une réponse vide ou absurde ne propose rien', () => {
    expect(readSuggestions(null)).toEqual({ count: 0, items: [] })
    expect(readSuggestions({ count: 'x', items: 'y' })).toEqual({ count: 0, items: [] })
  })
})
