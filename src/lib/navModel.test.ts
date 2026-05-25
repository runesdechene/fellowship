import { describe, it, expect } from 'vitest'
import { navItemsFor, entryState, isRouteValidFor, NAV_DEFS, type NavKey } from './navModel'

const person = { kind: 'person' as const, entityType: null }
const exposant = { kind: 'entity' as const, entityType: 'exposant' as const }

describe('navItemsFor', () => {
  it('personne → festivalier', () => expect(navItemsFor(person)).toEqual(['explorer','mes-dates','mes-createurs','profil','reglages']))
  it('entité exposant → cockpit', () => expect(navItemsFor(exposant)).toEqual(['explorer','dashboard','calendrier','communaute','vitrine','reglages']))
  it('null → explorer seul', () => expect(navItemsFor(null)).toEqual(['explorer']))
})

describe('entryState', () => {
  it('item Pro + plan free → lock-pro', () => expect(entryState('calendrier','free')).toBe('lock-pro'))
  it('item Pro + plan pro + construit → active', () => expect(entryState('calendrier','pro')).toBe('active'))
  it('item Pro + plan pro + non construit → bientot', () => expect(entryState('communaute','pro')).toBe('bientot'))
  it('item Pro + plan free (même non construit) → lock-pro', () => expect(entryState('communaute','free')).toBe('lock-pro'))
  it('item gratuit non construit → bientot', () => expect(entryState('mes-dates','free')).toBe('bientot'))
  it('item gratuit construit → active', () => expect(entryState('explorer','free')).toBe('active'))
})

describe('isRouteValidFor', () => {
  it('calendrier valide pour exposant', () => expect(isRouteValidFor('/calendrier', exposant)).toBe(true))
  it('calendrier invalide pour personne', () => expect(isRouteValidFor('/calendrier', person)).toBe(false))
  it('mes-dates valide pour personne', () => expect(isRouteValidFor('/mes-dates', person)).toBe(true))
  it('explorer valide pour les deux', () => {
    expect(isRouteValidFor('/explorer', person)).toBe(true)
    expect(isRouteValidFor('/explorer', exposant)).toBe(true)
  })
  it('route partagée (event) toujours valide', () => expect(isRouteValidFor('/evenement/abc', person)).toBe(true))
})

it('NAV_DEFS couvre toutes les clés utilisées', () => {
  const keys: NavKey[] = ['explorer','mes-dates','mes-createurs','profil','reglages','dashboard','calendrier','communaute','vitrine']
  keys.forEach(k => expect(NAV_DEFS[k]).toBeTruthy())
})
