// src/lib/onboarding.test.ts
import { describe, it, expect } from 'vitest'
import { slugify, deriveDepartment, resolveOnboardingFlow, resolveUniqueHandle } from './onboarding'

describe('slugify', () => {
  it('minuscule + tirets', () => expect(slugify('Rune de Chêne')).toBe('rune-de-chene'))
  it('retire accents', () => expect(slugify('Atelier Lumière')).toBe('atelier-lumiere'))
  it('caractères spéciaux → tirets, trim', () => expect(slugify('  Forge & Co !! ')).toBe('forge-co'))
  it('vide → vide', () => expect(slugify('')).toBe(''))
})

describe('deriveDepartment', () => {
  it('métropole = 2 premiers chiffres', () => expect(deriveDepartment('69003')).toBe('69'))
  it('Paris', () => expect(deriveDepartment('75011')).toBe('75'))
  it('Corse-du-Sud 2A (<20200)', () => expect(deriveDepartment('20000')).toBe('2A'))
  it('Haute-Corse 2B (>=20200)', () => expect(deriveDepartment('20600')).toBe('2B'))
  it('DOM = 3 chiffres', () => expect(deriveDepartment('97400')).toBe('974'))
  it('CP invalide → null', () => expect(deriveDepartment('abc')).toBeNull())
  it('CP vide → null', () => expect(deriveDepartment('')).toBeNull())
})

describe('resolveOnboardingFlow', () => {
  it('a déjà une entité → complétion personne seule, pas de création', () => {
    const f = resolveOnboardingFlow(1, null)
    expect(f.case).toBe('completion')
    expect(f.needsChoice).toBe(false)
    expect(f.createsEntity).toBe(false)
    expect(f.steps).toEqual(['name'])
  })
  it('0 entité, pas de choix encore → écran de choix', () => {
    const f = resolveOnboardingFlow(0, null)
    expect(f.needsChoice).toBe(true)
    expect(f.steps).toEqual(['choice'])
  })
  it('festivalier → name + postal, pas de création', () => {
    const f = resolveOnboardingFlow(0, 'festivalier')
    expect(f.createsEntity).toBe(false)
    expect(f.steps).toEqual(['name', 'postal'])
  })
  it('exposant → 5 étapes + création entité', () => {
    const f = resolveOnboardingFlow(0, 'exposant')
    expect(f.createsEntity).toBe(true)
    expect(f.steps).toEqual(['name', 'brand', 'craft', 'location', 'slug'])
  })
  it('plusieurs entités → toujours complétion (≥1)', () => {
    const f = resolveOnboardingFlow(3, null)
    expect(f.case).toBe('completion')
    expect(f.createsEntity).toBe(false)
  })
})

describe('resolveUniqueHandle', () => {
  it('renvoie la base si libre', async () => {
    const h = await resolveUniqueHandle('Camille', async () => false)
    expect(h).toBe('camille')
  })
  it('suffixe compteur si pris', async () => {
    const taken = new Set(['camille', 'camille-2'])
    const h = await resolveUniqueHandle('Camille', async (x) => taken.has(x))
    expect(h).toBe('camille-3')
  })
  it('base vide → membre', async () => {
    const h = await resolveUniqueHandle('', async () => false)
    expect(h).toBe('membre')
  })
  it('épuisement → fallback timestamp', async () => {
    const h = await resolveUniqueHandle('Camille', async () => true)
    expect(h).toMatch(/^camille-\d{10,}$/)
  })
})
