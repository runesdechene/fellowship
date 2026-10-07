/**
 * QUOI     — tests de lib/supabase.ts : must(), qui rend les données ou lève l'erreur de la base.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { must } from './supabase'

describe('must', () => {
  it('rend les données quand la base répond', () => {
    expect(must({ data: [{ id: 'a' }], error: null })).toEqual([{ id: 'a' }])
  })
  it('rend null quand la base répond « rien » (maybeSingle)', () => {
    expect(must({ data: null, error: null })).toBeNull()
  })
  it('lève l’erreur de la base au lieu de rendre un vide trompeur', () => {
    expect(() => must({ data: null, error: { message: 'réseau coupé' } })).toThrow('réseau coupé')
  })
})
