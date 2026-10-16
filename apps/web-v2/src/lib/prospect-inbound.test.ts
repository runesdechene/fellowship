/**
 * QUOI     — tests de supabase/functions/_shared/prospect-inbound.ts : lire un e-mail reçu.
 * POURQUOI — une réponse mal lue se rangerait dans le mauvais fil, ou nulle part.
 */
import { describe, expect, it } from 'vitest'
import {
  bodyText,
  emailAddress,
  threadKeys,
} from '../../../../supabase/functions/_shared/prospect-inbound'

describe('emailAddress', () => {
  it('garde l’adresse, en minuscules, sans le nom', () => {
    expect(emailAddress('"Manon Leclerc" <Manon@CuirDeLune.fr>')).toBe('manon@cuirdelune.fr')
    expect(emailAddress('manon@cuirdelune.fr')).toBe('manon@cuirdelune.fr')
  })
})

describe('threadKeys', () => {
  it('In-Reply-To puis References, sans doublon', () => {
    expect(threadKeys({ 'In-Reply-To': '<b@x>', references: '<a@x> <b@x>' })).toEqual([
      '<b@x>',
      '<a@x>',
    ])
  })
  it('rien : liste vide', () => {
    expect(threadKeys({})).toEqual([])
  })
})

describe('bodyText', () => {
  it('le texte quand il existe', () => {
    expect(bodyText({ text: 'Bonjour', html: '<p>x</p>' })).toBe('Bonjour')
  })
  it('sinon l’HTML réduit à du texte', () => {
    expect(bodyText({ text: null, html: '<p>Merci &amp; à bientôt</p><p>Manon<br>Cuir</p>' })).toBe(
      'Merci & à bientôt\n\nManon\nCuir',
    )
  })
  it('un HTML en data:base64', () => {
    const html = `data:text/html;base64,${btoa('<p>Oui</p>')}`
    expect(bodyText({ text: null, html })).toBe('Oui')
  })
})
