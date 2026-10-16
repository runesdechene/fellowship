/**
 * QUOI     — tests de lib/prospect-template.ts : remplir un modèle d'e-mail de prospection.
 * POURQUOI — un emplacement vide ne doit jamais laisser « Bonjour , » dans un e-mail envoyé.
 */
import { describe, expect, it } from 'vitest'
import {
  fillTemplate,
  pickTemplate,
  previousWriter,
  relayIntro,
  templateValues,
} from './prospect-template'

const values = templateValues({
  name: 'Manon Leclerc',
  brand: 'Cuir de Lune',
  activity: 'Maroquinerie',
  city: 'Nantes',
  source: 'Salon de Rennes',
})

describe('fillTemplate', () => {
  it('remplit les emplacements, {prénom} est le premier mot du nom', () => {
    expect(fillTemplate('Bonjour {prénom}, ton stand {marque} au {source}', values)).toBe(
      'Bonjour Manon, ton stand Cuir de Lune au Salon de Rennes',
    )
  })
  it('un emplacement vide s’efface avec son espace et sa virgule orpheline', () => {
    const empty = templateValues({
      name: null,
      brand: null,
      activity: null,
      city: null,
      source: null,
    })
    expect(fillTemplate('Bonjour {prénom},\nÀ bientôt', empty)).toBe('Bonjour,\nÀ bientôt')
  })
  it('laisse tel quel un emplacement inconnu', () => {
    expect(fillTemplate('{inconnu} reste', values)).toBe('{inconnu} reste')
  })
})

describe('relayIntro', () => {
  it('annonce le relais quand un autre écrivait', () => {
    expect(relayIntro('Mathéo')).toBe('Je prends le relais de Mathéo. ')
  })
  it('rien sans prédécesseur', () => {
    expect(relayIntro(null)).toBe('')
  })
})

describe('pickTemplate', () => {
  const templates = [
    { id: 'r', kind: 'relance', archived_at: null },
    { id: 'p1', kind: 'premier_contact', archived_at: '2026-10-01' },
    { id: 'p2', kind: 'premier_contact', archived_at: null },
    { id: 'b', kind: 'bienvenue', archived_at: null },
  ]
  it('le modèle demandé dans l’adresse l’emporte', () => {
    expect(pickTemplate(templates, 'bienvenue', true)).toBe('b')
  })
  it('sans e-mail envoyé : le premier contact non archivé', () => {
    expect(pickTemplate(templates, null, false)).toBe('p2')
  })
  it('après un premier envoi : aucun modèle', () => {
    expect(pickTemplate(templates, null, true)).toBeNull()
  })
})

describe('previousWriter', () => {
  const out = (user: string, name: string) => ({
    direction: 'out',
    sender_user_id: user,
    sender_name: name,
  })
  it('le dernier expéditeur sortant, s’il n’est pas moi', () => {
    expect(previousWriter([out('me', 'Uriel'), out('m', 'Mathéo')], 'me')).toBe('Mathéo')
  })
  it('null si le dernier sortant, c’est moi, ou s’il n’y en a pas', () => {
    expect(previousWriter([out('m', 'Mathéo'), out('me', 'Uriel')], 'me')).toBeNull()
    expect(
      previousWriter([{ direction: 'in', sender_user_id: null, sender_name: null }], 'me'),
    ).toBeNull()
  })
})
