import { describe, it, expect } from 'vitest'
import { normalizeLinkUrl, addChip, reorderPositions, canEditVitrine, SPECIALTIES_CAP } from './vitrine-edit'

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

describe('canEditVitrine', () => {
  it('vrai si l\'entité est dans les memberships de la personne', () => {
    expect(canEditVitrine(['e1', 'e2'], 'e2')).toBe(true)
  })
  it('faux si non membre (mode personne sur la vitrine d\'autrui ou la sienne sans appartenance)', () => {
    expect(canEditVitrine(['e1'], 'e2')).toBe(false)
  })
  it('faux si pas d\'entité (actor_id null)', () => {
    expect(canEditVitrine(['e1'], null)).toBe(false)
  })
  it('faux si aucune entité', () => {
    expect(canEditVitrine([], 'e1')).toBe(false)
  })
})
