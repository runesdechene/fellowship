/**
 * QUOI     — tests de lib/prospect-template.ts : remplir un modèle d'e-mail de prospection.
 * POURQUOI — un emplacement vide ne doit jamais laisser « Bonjour , » dans un e-mail envoyé.
 */
import { describe, expect, it } from 'vitest'
import { fillTemplate, relayIntro, templateValues } from './prospect-template'

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
