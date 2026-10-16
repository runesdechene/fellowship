/**
 * QUOI     — tests de lib/prospect.ts : libellé du contact, pourcentages, messages d'écriture,
 *            e-mail rangé.
 * POURQUOI — ce sont les règles que le tableau affiche ; un message d'erreur doit parler français.
 */
import { describe, expect, it } from 'vitest'
import { contactLabel, normalizeEmail, percent, validContactDate, writeError } from './prospect'

describe('contactLabel', () => {
  it('le canal et la date', () => {
    expect(contactLabel('mail', '2026-10-10')).toBe('Mail · 10 oct.')
  })
  it('l’un sans l’autre', () => {
    expect(contactLabel('appel', null)).toBe('Appel')
    expect(contactLabel(null, '2026-10-02')).toBe('2 oct.')
  })
  it('rien : null', () => {
    expect(contactLabel(null, null)).toBeNull()
  })
})

describe('percent', () => {
  it('arrondit, et rend 0 sur un total nul', () => {
    expect(percent(212, 486)).toBe(44)
    expect(percent(3, 0)).toBe(0)
  })
})

describe('writeError', () => {
  it('un e-mail en double parle de la liste', () => {
    expect(writeError({ code: '23505', message: 'duplicate key' })).toBe(
      'Cet e-mail est déjà dans la liste.',
    )
  })
  it('sinon le message de la base', () => {
    expect(writeError({ message: 'réservé aux admins' })).toBe('réservé aux admins')
  })
})

describe('normalizeEmail', () => {
  it('minuscules, sans espaces, vide = null', () => {
    expect(normalizeEmail('  Manon@CuirDeLune.fr ')).toBe('manon@cuirdelune.fr')
    expect(normalizeEmail('   ')).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
  })
})

describe('validContactDate', () => {
  it('une date complète et plausible', () => {
    expect(validContactDate('2026-10-10')).toBe(true)
  })
  it('une année en cours de frappe ou vide ne passe pas', () => {
    expect(validContactDate('0002-10-16')).toBe(false)
    expect(validContactDate('')).toBe(false)
  })
})
