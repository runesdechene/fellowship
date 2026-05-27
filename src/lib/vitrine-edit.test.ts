import { describe, it, expect } from 'vitest'
import { normalizeLinkUrl, addChip, reorderPositions, SPECIALTIES_CAP } from './vitrine-edit'

describe('normalizeLinkUrl', () => {
  it('ajoute https:// si pas de schéma', () => {
    expect(normalizeLinkUrl('terresetflammes.fr')).toBe('https://terresetflammes.fr')
  })
  it('préserve un schéma existant', () => {
    expect(normalizeLinkUrl('http://x.fr')).toBe('http://x.fr')
    expect(normalizeLinkUrl('https://x.fr')).toBe('https://x.fr')
  })
  it('trim les espaces', () => {
    expect(normalizeLinkUrl('  x.fr  ')).toBe('https://x.fr')
  })
  it('chaîne vide → vide', () => {
    expect(normalizeLinkUrl('   ')).toBe('')
  })
})

describe('addChip', () => {
  it('ajoute un chip trimé', () => {
    expect(addChip(['a'], '  b ')).toEqual(['a', 'b'])
  })
  it('ignore une entrée vide', () => {
    expect(addChip(['a'], '   ')).toEqual(['a'])
  })
  it('dédoublonne (insensible à la casse/espaces)', () => {
    expect(addChip(['Céramique'], 'céramique')).toEqual(['Céramique'])
  })
  it(`respecte le cap de ${SPECIALTIES_CAP}`, () => {
    const full = Array.from({ length: SPECIALTIES_CAP }, (_, i) => `s${i}`)
    expect(addChip(full, 'trop')).toEqual(full)
  })
})

describe('reorderPositions', () => {
  it('renvoie {id, position} séquentiels à partir de 0', () => {
    expect(reorderPositions(['z', 'a', 'm'])).toEqual([
      { id: 'z', position: 0 },
      { id: 'a', position: 1 },
      { id: 'm', position: 2 },
    ])
  })
})
