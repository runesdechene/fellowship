import { describe, expect, it } from 'vitest'
import { formatEuros, formatSignedEuros, ledgerProfit, ledgerRevenue } from './money'

const lines = [
  { amount: 5400, direction: 'in' }, // ventes
  { amount: 600, direction: 'out' }, // emplacement
  { amount: 80, direction: 'out' }, // essence
]

describe('ledgerRevenue', () => {
  it('ne somme que les entrants', () => {
    expect(ledgerRevenue(lines)).toBe(5400)
  })

  it('rend zéro sans ligne', () => {
    expect(ledgerRevenue([])).toBe(0)
  })
})

describe('ledgerProfit', () => {
  it('soustrait les sortants des entrants', () => {
    expect(ledgerProfit(lines)).toBe(4720)
  })

  it('peut être négatif', () => {
    expect(ledgerProfit([{ amount: 300, direction: 'out' }])).toBe(-300)
  })
})

// Le français sépare les milliers par une espace fine insécable (U+202F),
// pas par une espace ordinaire : c'est ce que rend toLocaleString('fr-FR').
const THIN = ' '

describe('formatEuros', () => {
  it('groupe les milliers et arrondit', () => {
    expect(formatEuros(5400)).toBe(`5${THIN}400 €`)
    expect(formatEuros(184.4)).toBe('184 €')
  })
})

describe('formatSignedEuros', () => {
  it('signe toujours le résultat', () => {
    expect(formatSignedEuros(4720)).toBe(`+4${THIN}720 €`)
    expect(formatSignedEuros(-310)).toBe('−310 €')
    expect(formatSignedEuros(0)).toBe('+0 €')
  })
})
