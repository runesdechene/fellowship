// src/lib/v2-switch.test.ts
import { describe, it, expect } from 'vitest'
import { resolveV2Switch } from './v2-switch'

describe('resolveV2Switch', () => {
  it('sans paramètre ni mémoire → V1', () => {
    expect(resolveV2Switch('app2', '', null)).toEqual({ enabled: false, persist: null })
  })
  it('?app2=1 → V2 et on mémorise', () => {
    expect(resolveV2Switch('app2', '?app2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
  it('?app2=0 → V1 et on efface la mémoire', () => {
    expect(resolveV2Switch('app2', '?app2=0', '1')).toEqual({ enabled: false, persist: null })
  })
  it('sans paramètre mais mémoire allumée → V2', () => {
    expect(resolveV2Switch('app2', '', '1')).toEqual({ enabled: true, persist: '1' })
  })
  it('valeur de mémoire inattendue → V1', () => {
    expect(resolveV2Switch('app2', '', 'oui')).toEqual({ enabled: false, persist: null })
  })
  it('le paramètre de la vitrine n\'allume pas l\'app', () => {
    expect(resolveV2Switch('app2', '?v2=1', null)).toEqual({ enabled: false, persist: null })
  })
  it('le paramètre de l\'app n\'allume pas la vitrine', () => {
    expect(resolveV2Switch('v2', '?app2=1', null)).toEqual({ enabled: false, persist: null })
  })
  it('les deux paramètres à la fois → chacun le sien', () => {
    expect(resolveV2Switch('app2', '?v2=1&app2=1', null)).toEqual({ enabled: true, persist: '1' })
    expect(resolveV2Switch('v2', '?v2=1&app2=1', null)).toEqual({ enabled: true, persist: '1' })
  })
})
