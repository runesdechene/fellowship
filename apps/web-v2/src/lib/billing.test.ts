/**
 * QUOI     — les règles de la facturation : SIREN, fenêtre prête, phrase de la ligne.
 * POURQUOI — une facture au mauvais numéro ne se rattrape pas.
 */
import { describe, expect, test } from 'vitest'
import { billingNote, billingReady, validSiren } from './billing'

describe('validSiren', () => {
  test('9 chiffres et une clé juste, espaces permis', () => {
    expect(validSiren('552 100 554')).toBe(true)
    expect(validSiren('404833048')).toBe(true)
  })
  test('refuse une mauvaise longueur, une mauvaise clé, du texte', () => {
    expect(validSiren('5521005')).toBe(false)
    expect(validSiren('123456789')).toBe(false)
    expect(validSiren('abcdefghi')).toBe(false)
  })
})

describe('billingReady', () => {
  test('une raison sociale, et un SIREN juste ou « pas de SIREN »', () => {
    expect(billingReady({ legalName: 'Atelier EI', siren: '552100554', noSiren: false })).toBe(true)
    expect(billingReady({ legalName: 'Foreign Ltd', siren: '', noSiren: true })).toBe(true)
    expect(billingReady({ legalName: ' ', siren: '552100554', noSiren: false })).toBe(false)
    expect(billingReady({ legalName: 'Atelier EI', siren: '123456789', noSiren: false })).toBe(
      false,
    )
  })
})

describe('billingNote', () => {
  test('ce qui est enregistré, ou à quoi ça sert', () => {
    const empty = { legal_name: null, siren: null, billing_no_siren: null }
    expect(billingNote(empty)).toBe('Ta raison sociale et ton SIREN, pour des factures à ton nom.')
    expect(billingNote({ ...empty, legal_name: 'SARL Runes', siren: '552100554' })).toBe(
      'SARL Runes · SIREN 552 100 554',
    )
    expect(billingNote({ ...empty, legal_name: 'Foreign Ltd', billing_no_siren: true })).toBe(
      'Foreign Ltd · sans SIREN',
    )
  })
})
