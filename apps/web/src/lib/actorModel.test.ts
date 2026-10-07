import { describe, it, expect } from 'vitest'
import { presenceNature, actorCan, pickCurrentActor, deriveNeedsOnboarding, ENTITY_STORAGE_KEY, type ActorView } from './actorModel'

const uriel: ActorView   = { id:'u1', kind:'person', entityType:null,        label:'Uriel',         hasName:true }
const rune: ActorView    = { id:'e1', kind:'entity', entityType:'exposant',  label:'Rune de Chêne', hasName:true }
const orga: ActorView    = { id:'e2', kind:'entity', entityType:'festival',  label:'Fest Orga',     hasName:true }

describe('presenceNature (qui peut aller à un festival, et comment)', () => {
  it('personne → visiteur', () => expect(presenceNature(uriel)).toBe('visitor'))
  it('exposant → exposant',  () => expect(presenceNature(rune)).toBe('exhibitor'))
  it('festival/orga → null (ne va pas, il organise)', () => expect(presenceNature(orga)).toBeNull())
})

describe('actorCan', () => {
  it('exposant peut exposer, pas organiser', () => {
    expect(actorCan(rune,'exhibit')).toBe(true)
    expect(actorCan(rune,'organize')).toBe(false)
  })
  it('festival peut organiser, pas aller', () => {
    expect(actorCan(orga,'organize')).toBe(true)
    expect(actorCan(orga,'attend')).toBe(false)
  })
  it('personne peut aller, pas exposer ni avoir de vitrine', () => {
    expect(actorCan(uriel,'attend')).toBe(true)
    expect(actorCan(uriel,'exhibit')).toBe(false)
    expect(actorCan(uriel,'haveVitrine')).toBe(false)
  })
})

describe('pickCurrentActor', () => {
  it('défaut = la personne si rien de stocké', () => expect(pickCurrentActor(uriel,[rune],null).id).toBe('u1'))
  it('entité stockée si valide', () => expect(pickCurrentActor(uriel,[rune],'e1').id).toBe('e1'))
  it('retombe sur la personne si id stocké invalide', () => expect(pickCurrentActor(uriel,[rune],'x').id).toBe('u1'))
})

describe('deriveNeedsOnboarding', () => {
  it('vrai si la personne n’a pas de prénom', () => expect(deriveNeedsOnboarding({...uriel,hasName:false})).toBe(true))
  it('faux sinon', () => expect(deriveNeedsOnboarding(uriel)).toBe(false))
  it('vrai si pas de personne', () => expect(deriveNeedsOnboarding(null)).toBe(true))
})

it('clé de stockage stable', () => expect(ENTITY_STORAGE_KEY).toBe('flwsh.currentActorId'))
