import { describe, it, expect } from 'vitest'
import { navItemsFor, entryState, isRouteValidFor, planForActor, isCertified, mobilePrimaryFor, mobileSecondaryFor, NAV_DEFS, vitrineHref, type NavKey } from './navModel'

const person = { kind: 'person' as const, entityType: null }
const exposant = { kind: 'entity' as const, entityType: 'exposant' as const }

describe('navItemsFor', () => {
  it('personne → festivalier (sans profil — un festivalier n\'a pas de vitrine)', () => expect(navItemsFor(person)).toEqual(['explorer','calendrier','mes-createurs','reglages']))
  it('entité exposant → cockpit', () => expect(navItemsFor(exposant)).toEqual(['explorer','dashboard','calendrier','communaute','vitrine','reglages']))
  it('null → explorer seul', () => expect(navItemsFor(null)).toEqual(['explorer']))
})

describe('entryState', () => {
  it('calendrier gratuit construit → active', () => expect(entryState('calendrier','free')).toBe('active'))
  it('calendrier (plan pro) → active', () => expect(entryState('calendrier','pro')).toBe('active'))
  it('item Pro + plan pro + dashboard construit → active', () => expect(entryState('dashboard','pro')).toBe('active'))
  it('item Pro + plan free (même non construit) → lock-pro', () => expect(entryState('dashboard','free')).toBe('lock-pro'))
  it('item gratuit construit (mes-dates) → active', () => expect(entryState('mes-dates','free')).toBe('active'))
  it('item gratuit construit → active', () => expect(entryState('explorer','free')).toBe('active'))
})

describe('isRouteValidFor', () => {
  it('calendrier valide pour exposant', () => expect(isRouteValidFor('/calendrier', exposant)).toBe(true))
  it('calendrier valide pour personne (désormais gratuit)', () => expect(isRouteValidFor('/calendrier', person)).toBe(true))
  it('explorer valide pour les deux', () => {
    expect(isRouteValidFor('/explorer', person)).toBe(true)
    expect(isRouteValidFor('/explorer', exposant)).toBe(true)
  })
  it('route partagée (event) toujours valide', () => expect(isRouteValidFor('/evenement/abc', person)).toBe(true))
  it('vitrine publique /{slug} valide pour tout acteur', () => {
    expect(isRouteValidFor('/runes-de-chene', exposant)).toBe(true)
    expect(isRouteValidFor('/une-marque', person)).toBe(true)
    expect(isRouteValidFor('/runes-de-chene/embed', person)).toBe(true)
  })
  it('route Pro réservée reste bloquée pour personne', () => {
    expect(isRouteValidFor('/tableau-de-bord', person)).toBe(false)
    expect(isRouteValidFor('/communaute', person)).toBe(false)
  })
})

describe('mobilePrimaryFor / mobileSecondaryFor', () => {
  it('exposant : 3 primaires = Cockpit/Calendrier/Explorer', () => {
    expect(mobilePrimaryFor(exposant)).toEqual(['dashboard', 'calendrier', 'explorer'])
  })
  it('visiteur : 3 primaires = Explorer/Calendrier/Mes créateurs', () => {
    expect(mobilePrimaryFor(person)).toEqual(['explorer', 'calendrier', 'mes-createurs'])
  })
  it('secondaire = nav de l\'acteur moins les primaires (sans doublon)', () => {
    const sec = mobileSecondaryFor(exposant)
    expect(sec).toEqual(['communaute', 'vitrine', 'reglages'])
    expect(sec.some(k => mobilePrimaryFor(exposant).includes(k))).toBe(false)
  })
})

describe('planForActor', () => {
  it('entité pro → pro', () => expect(planForActor({ kind: 'entity' }, { plan: 'pro' })).toBe('pro'))
  it('entité free → free', () => expect(planForActor({ kind: 'entity' }, { plan: 'free' })).toBe('free'))
  it('entité sans plan (null) → free', () => {
    expect(planForActor({ kind: 'entity' }, { plan: null })).toBe('free')
    expect(planForActor({ kind: 'entity' }, {})).toBe('free')
  })
  it('personne → free quelle que soit la valeur', () => expect(planForActor({ kind: 'person' }, { plan: 'pro' })).toBe('free'))
  it('acteur null → free', () => expect(planForActor(null, null)).toBe('free'))
})

describe('isCertified', () => {
  it('plan pro → certifié', () => expect(isCertified({ plan: 'pro', verified: false })).toBe(true))
  it('verified true (plan free) → certifié (override manuel)', () => expect(isCertified({ plan: 'free', verified: true })).toBe(true))
  it('plan free + non verified → non certifié', () => expect(isCertified({ plan: 'free', verified: false })).toBe(false))
  it('valeurs nulles/absentes → non certifié', () => {
    expect(isCertified({ plan: null, verified: null })).toBe(false)
    expect(isCertified({})).toBe(false)
  })
  it('pro ET verified → certifié', () => expect(isCertified({ plan: 'pro', verified: true })).toBe(true))
})

it('NAV_DEFS couvre toutes les clés utilisées', () => {
  const keys: NavKey[] = ['explorer','mes-dates','mes-createurs','profil','reglages','dashboard','calendrier','communaute','vitrine']
  keys.forEach(k => expect(NAV_DEFS[k]).toBeTruthy())
})

describe('vitrineHref', () => {
  it('slug présent → /{slug}', () => expect(vitrineHref('terres-et-flammes')).toBe('/terres-et-flammes'))
  it('slug absent → /profil', () => {
    expect(vitrineHref(null)).toBe('/profil')
    expect(vitrineHref(undefined)).toBe('/profil')
  })
})
