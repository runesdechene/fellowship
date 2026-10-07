import { describe, it, expect } from 'vitest'
import { paletteFor } from './map-style'

describe('paletteFor', () => {
  it('nuit : terres sombres chaudes', () => {
    expect(paletteFor('night').land).toBe('#26282b')
  })
  it('jour : terres parchemin claires', () => {
    expect(paletteFor('day').land).toBe('#eeeae4')
  })
  it('chaque palette a toutes les clés', () => {
    for (const t of ['night', 'day'] as const) {
      const p = paletteFor(t)
      expect(Object.keys(p).sort()).toEqual(
        ['boundary', 'building', 'green', 'halo', 'land', 'landAlt', 'road', 'roadMajor', 'text', 'water'].sort()
      )
    }
  })
})
