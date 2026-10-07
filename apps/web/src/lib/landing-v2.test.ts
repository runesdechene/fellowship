// src/lib/landing-v2.test.ts
import { describe, it, expect } from 'vitest'
import { resolveLandingV2 } from './landing-v2'

describe('resolveLandingV2', () => {
  it('sans paramètre ni mémoire → V1', () => {
    expect(resolveLandingV2('', null)).toEqual({ enabled: false, persist: null })
  })
  it('?v2=1 → V2 et on mémorise', () => {
    expect(resolveLandingV2('?v2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
  it('?v2=0 → V1 et on efface la mémoire', () => {
    expect(resolveLandingV2('?v2=0', '1')).toEqual({ enabled: false, persist: null })
  })
  it('sans paramètre mais mémoire allumée → V2, sans réécrire', () => {
    expect(resolveLandingV2('', '1')).toEqual({ enabled: true, persist: '1' })
  })
  it('valeur de mémoire inattendue → V1', () => {
    expect(resolveLandingV2('', 'oui')).toEqual({ enabled: false, persist: null })
  })
  it('autre paramètre présent → ignoré', () => {
    expect(resolveLandingV2('?utm_source=insta', null)).toEqual({ enabled: false, persist: null })
  })
})
