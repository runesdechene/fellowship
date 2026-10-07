import { describe, it, expect } from 'vitest'
import { LEDGER_CATEGORIES, defaultDirectionFor, ledgerProfit } from './ledger'

describe('defaultDirectionFor', () => {
  it('catégories sortantes par défaut', () => {
    expect(defaultDirectionFor('emplacement')).toBe('out')
    expect(defaultDirectionFor('essence')).toBe('out')
    expect(defaultDirectionFor('autre')).toBe('out')
  })
  it('catégories entrantes par défaut', () => {
    expect(defaultDirectionFor('cachet')).toBe('in')
    expect(defaultDirectionFor('ventes')).toBe('in')
    expect(defaultDirectionFor('remboursement')).toBe('in')
  })
})

describe('ledgerProfit', () => {
  it('somme(in) - somme(out)', () => {
    expect(ledgerProfit([
      { amount: 1000, direction: 'in' },
      { amount: 300, direction: 'out' },
      { amount: 220, direction: 'out' },
    ])).toBe(480)
  })
  it('liste vide = 0', () => {
    expect(ledgerProfit([])).toBe(0)
  })
})

describe('LEDGER_CATEGORIES', () => {
  it('expose les 9 catégories fixes', () => {
    expect(LEDGER_CATEGORIES.map(c => c.key)).toEqual([
      'emplacement', 'cachet', 'essence', 'peage', 'hebergement', 'repas', 'remboursement', 'ventes', 'autre',
    ])
  })
})
