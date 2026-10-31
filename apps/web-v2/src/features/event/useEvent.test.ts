/**
 * QUOI     — tests de ledgerState (useEvent.ts) : le registre de « Mon bilan » sur la fiche.
 * POURQUOI — une date chiffrée doit compter ses recettes ouvertes, et ne jamais afficher un CA
 *            faux quand elles sont verrouillées.
 */
import { describe, expect, it } from 'vitest'
import { ledgerState, type EventLedgerLine } from './useEvent'

const stand: EventLedgerLine = {
  id: 's',
  category: 'emplacement',
  label: null,
  amount: 200,
  direction: 'out',
  source: 'stepper',
}

describe('ledgerState', () => {
  it('ajoute Carte et Espèces ouvertes au registre et aux totaux', () => {
    const state = ledgerState([stand], { carte: 1000, especes: 300 })
    expect(state.ledger.map((line) => line.label)).toEqual([null, 'Carte', 'Espèces'])
    expect(state.revenue).toBe(1300)
    expect(state.net).toBe(1100)
    expect(state.revenueMasked).toBe(false)
  })

  it('verrouillées : masqué, rempli, sans inventer de lignes', () => {
    const state = ledgerState([], 'masked')
    expect(state.ledger).toEqual([])
    expect(state.revenueMasked).toBe(true)
    expect(state.revenue).toBe(0)
  })

  it('sans bilan ni chiffré : rien', () => {
    expect(ledgerState([], undefined)).toEqual({
      ledger: [],
      revenue: null,
      net: null,
      revenueMasked: false,
    })
  })
})
