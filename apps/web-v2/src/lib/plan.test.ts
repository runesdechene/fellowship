/**
 * QUOI     — tests de lib/plan.ts : statut Pro, badge Certifié, horizon des 6 mois.
 * POURQUOI — toute la règle du gratuit se vérifie ici ; les écrans ne font que la lire.
 */
import { describe, expect, it } from 'vitest'
import {
  canActOn,
  canChangeStatus,
  devOverride,
  isCertified,
  isPro,
  monthsBeyond,
  proHorizon,
} from './plan'

const now = new Date(2026, 9, 8, 12) // 8 octobre 2026
const entity = (
  fields: Partial<{ plan: string; comped_pro_until: string; verified: boolean }>,
) => ({
  plan: fields.plan ?? 'free',
  comped_pro_until: fields.comped_pro_until ?? null,
  verified: fields.verified ?? false,
})

describe('isPro', () => {
  it('une enseigne qui paie est Pro', () => {
    expect(isPro(entity({ plan: 'pro' }), now)).toBe(true)
  })
  it('un Pro offert qui court encore est Pro', () => {
    expect(isPro(entity({ comped_pro_until: '2026-11-01T00:00:00Z' }), now)).toBe(true)
  })
  it('un Pro offert expiré hier ne l’est plus', () => {
    expect(isPro(entity({ comped_pro_until: '2026-10-07T00:00:00Z' }), now)).toBe(false)
  })
  it('un compte personnel est gratuit', () => {
    expect(isPro(null, now)).toBe(false)
  })
})

describe('isCertified', () => {
  it('Pro ou certifié à la main', () => {
    expect(isCertified(entity({ plan: 'pro' }), now)).toBe(true)
    expect(isCertified(entity({ verified: true }), now)).toBe(true)
    expect(isCertified(entity({}), now)).toBe(false)
  })
})

describe('proHorizon', () => {
  it('le premier jour du septième mois', () => {
    expect(proHorizon(now)).toEqual(new Date(2027, 3, 1))
  })
  it('passe l’année en décembre', () => {
    expect(proHorizon(new Date(2026, 11, 20))).toEqual(new Date(2027, 5, 1))
  })
})

describe('canActOn', () => {
  it('le dernier jour du sixième mois est permis, le premier du septième refusé', () => {
    expect(canActOn(new Date(2027, 2, 31), false, now)).toBe(true)
    expect(canActOn(new Date(2027, 3, 1), false, now)).toBe(false)
  })
  it('le Pro agit sur toute l’année', () => {
    expect(canActOn(new Date(2027, 8, 1), true, now)).toBe(true)
  })
})

describe('canChangeStatus', () => {
  it('une date déjà posée au-delà de l’horizon reste modifiable', () => {
    expect(canChangeStatus(new Date(2027, 6, 1), true, false, now)).toBe(true)
  })
  it('une nouvelle date au-delà de l’horizon est refusée en gratuit', () => {
    expect(canChangeStatus(new Date(2027, 6, 1), false, false, now)).toBe(false)
  })
})

describe('monthsBeyond', () => {
  it('compte les mois jusqu’au début de la date', () => {
    expect(monthsBeyond(new Date(2027, 6, 4), now)).toBe(9)
  })
})

describe('devOverride', () => {
  it('?plan=free force le gratuit en développement', () => {
    expect(devOverride('?plan=free', true)).toBe('free')
  })
  it('sans effet en production', () => {
    expect(devOverride('?plan=free', false)).toBeNull()
  })
  it('sans paramètre, rien', () => {
    expect(devOverride('', true)).toBeNull()
  })
})
