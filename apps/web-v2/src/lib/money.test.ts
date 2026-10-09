/**
 * QUOI     — tests de lib/money.ts : les montants et le registre de bilan.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import {
  formatEuros,
  formatPrice,
  formatSignedEuros,
  ledgerProfit,
  ledgerRevenue,
  goalShare,
  parseAmount,
  standLine,
} from './money'

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

describe('standLine', () => {
  it('un exposant qui paie sa place : un emplacement qui SORT', () => {
    expect(standLine('payeur')).toEqual({ direction: 'out', category: 'emplacement' })
  })
  it('un exposant payé pour venir : un cachet qui ENTRE', () => {
    expect(standLine('paye')).toEqual({ direction: 'in', category: 'cachet' })
  })
})

describe('parseAmount', () => {
  it('lit un montant tapé à la française', () => {
    expect(parseAmount('450')).toBe(450)
    expect(parseAmount('1 250,50')).toBe(1250.5)
    expect(parseAmount(' 300 € ')).toBe(300)
  })

  it('vide : pas de montant', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
  })

  it('ce qui n’est pas un montant positif est refusé', () => {
    expect(parseAmount('beaucoup')).toBe('invalide')
    expect(parseAmount('-20')).toBe('invalide')
  })
})

describe('goalShare', () => {
  it('la part de l’objectif atteinte, en pourcentage arrondi et en jauge bornée', () => {
    expect(goalShare(74444, 90000)).toEqual({ percent: 83, ratio: 74444 / 90000 })
    expect(goalShare(120000, 90000)).toEqual({ percent: 133, ratio: 1 })
  })
})

describe('formatPrice', () => {
  it('écrit les centimes à la française', () => {
    expect(formatPrice(999)).toBe('9,99 €')
    expect(formatPrice(11988)).toBe('119,88 €')
    expect(formatPrice(1200)).toBe('12,00 €')
  })
})
