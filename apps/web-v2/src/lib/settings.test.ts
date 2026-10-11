/**
 * QUOI     — tests des règles des Réglages : les champs du profil, la phrase d'une enseigne, le mot
 *            qui confirme la suppression.
 * POURQUOI — un nom vide ou un code postal faux ne doit jamais partir ; la phrase d'abonnement dit
 *            vrai pour chaque état Stripe ; une suppression ne part que sur le mot exact.
 */
import { describe, expect, test } from 'vitest'
import {
  cleanProfileValue,
  confirmsDeletion,
  entityLine,
  profileProblem,
  type EntityBilling,
} from './settings'

const now = new Date(2026, 9, 11)
const free: EntityBilling = {
  plan: 'free',
  comped_pro_until: null,
  verified: false,
  subscription_status: null,
  billing_interval: null,
  current_period_end: null,
  trial_end: null,
  legal_name: null,
}

describe('profileProblem', () => {
  test('le nom est obligatoire, 60 caractères au plus', () => {
    expect(profileProblem('display_name', '   ')).toBe('Ton nom ne peut pas être vide')
    expect(profileProblem('display_name', 'a'.repeat(61))).toBe('60 caractères au plus')
    expect(profileProblem('display_name', 'Uriel')).toBeNull()
  })
  test('le code postal : cinq chiffres, ou rien', () => {
    expect(profileProblem('postal_code', '6300')).toBe('Cinq chiffres')
    expect(profileProblem('postal_code', '63 000')).toBe('Cinq chiffres')
    expect(profileProblem('postal_code', '63000')).toBeNull()
    expect(profileProblem('postal_code', '')).toBeNull()
  })
  test('la ville : 60 caractères au plus, vide permis', () => {
    expect(profileProblem('city', 'a'.repeat(61))).toBe('60 caractères au plus')
    expect(profileProblem('city', '')).toBeNull()
  })
})

describe('cleanProfileValue', () => {
  test('retire les espaces ; un champ facultatif vide devient null', () => {
    expect(cleanProfileValue('display_name', '  Uriel ')).toBe('Uriel')
    expect(cleanProfileValue('city', '   ')).toBeNull()
    expect(cleanProfileValue('postal_code', ' 63000 ')).toBe('63000')
  })
})

describe('entityLine', () => {
  test('gratuit : le nombre de dates des 6 prochains mois, et Passer Pro', () => {
    expect(entityLine(free, now, 2)).toEqual({
      text: 'Gratuit · 2 dates sur tes 6 prochains mois',
      action: 'upgrade',
      pro: false,
    })
    expect(entityLine(free, now, 1).text).toBe('Gratuit · 1 date sur tes 6 prochains mois')
    expect(entityLine(free, now, 0).text).toBe('Gratuit · aucune date sur tes 6 prochains mois')
  })
  test('Pro payé : rythme, renouvellement, facture', () => {
    const pro = {
      ...free,
      plan: 'pro',
      subscription_status: 'active',
      billing_interval: 'year',
      current_period_end: '2027-03-12T10:00:00Z',
      legal_name: 'SARL Runes de Chêne',
    }
    expect(entityLine(pro, now, 5)).toEqual({
      text: 'Pro annuel · renouvelé le 12 mars 2027 · facture au nom de SARL Runes de Chêne',
      action: 'portal',
      pro: true,
    })
    expect(entityLine({ ...pro, billing_interval: 'month', legal_name: null }, now, 5).text).toBe(
      'Pro mensuel · renouvelé le 12 mars 2027',
    )
  })
  test('essai et paiement en attente', () => {
    const trial = {
      ...free,
      plan: 'pro',
      subscription_status: 'trialing',
      billing_interval: 'month',
      trial_end: '2026-10-25T10:00:00Z',
    }
    expect(entityLine(trial, now, 0).text).toBe('Pro mensuel · essai jusqu’au 25 octobre 2026')
    const late = { ...trial, subscription_status: 'past_due', trial_end: null }
    expect(entityLine(late, now, 0).text).toBe('Pro mensuel · paiement en attente')
    expect(entityLine(late, now, 0).action).toBe('portal')
  })
  test('Pro offert : la date de fin, aucun bouton', () => {
    const comped = { ...free, comped_pro_until: '2027-01-31T00:00:00Z' }
    expect(entityLine(comped, now, 3)).toEqual({
      text: 'Pro offert jusqu’au 31 janvier 2027',
      action: 'none',
      pro: true,
    })
  })
  test('Pro accordé sans abonnement ni date de fin : « Pro », aucun bouton', () => {
    const granted = { ...free, plan: 'pro', subscription_status: 'canceled' }
    expect(entityLine(granted, now, 4)).toEqual({ text: 'Pro', action: 'none', pro: true })
  })
  test('un compte de dates illisible ne passe pas pour « aucune date »', () => {
    expect(entityLine(free, now, null).text).toBe('Gratuit')
  })
  test('un abonnement résilié retombe en gratuit', () => {
    const canceled = { ...free, subscription_status: 'canceled' }
    expect(entityLine(canceled, now, 1).action).toBe('upgrade')
  })
})

describe('confirmsDeletion', () => {
  test('seul le mot exact confirme ; les espaces autour sont tolérés', () => {
    expect(confirmsDeletion('SUPPRIMER')).toBe(true)
    expect(confirmsDeletion('  SUPPRIMER ')).toBe(true)
    expect(confirmsDeletion('supprimer')).toBe(false)
    expect(confirmsDeletion('SUPPRIME')).toBe(false)
  })
})
