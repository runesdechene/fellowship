/**
 * QUOI     — tests de lib/admin-board.ts : colonnes voisines, âge, réchauffement, semaine.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { ageLabel, doneSince, doneThisWeek, isStale, neighbours } from './admin-board'

// Un jeudi après-midi.
const now = new Date('2026-10-22T15:00:00')

describe('neighbours', () => {
  it('les bords n’ont qu’un voisin', () => {
    expect(neighbours('think')).toEqual({ back: undefined, next: 'todo' })
    expect(neighbours('now')).toEqual({ back: 'todo', next: 'done' })
    expect(neighbours('done')).toEqual({ back: 'now', next: undefined })
  })
})

describe('ageLabel', () => {
  it('se tait le jour même, compte les jours ensuite', () => {
    expect(ageLabel('2026-10-22T08:00:00', now)).toBeNull()
    expect(ageLabel('2026-10-21T23:00:00', now)).toBe('depuis 1 j')
    expect(ageLabel('2026-10-13T10:00:00', now)).toBe('depuis 9 j')
  })
})

describe('isStale', () => {
  it('se réchauffe à 5 jours, jamais dans « Fait »', () => {
    expect(isStale('todo', '2026-10-18T10:00:00', now)).toBe(false)
    expect(isStale('todo', '2026-10-17T10:00:00', now)).toBe(true)
    expect(isStale('done', '2026-10-01T10:00:00', now)).toBe(false)
  })
})

describe('doneThisWeek', () => {
  it('compte depuis lundi minuit', () => {
    const moved = ['2026-10-19T00:00:00', '2026-10-18T23:59:00', '2026-10-22T09:00:00']
    expect(doneThisWeek(moved, now)).toBe(2)
  })
})

describe('doneSince', () => {
  it('remonte de sept jours', () => {
    expect(doneSince(now)).toEqual(new Date('2026-10-15T15:00:00'))
  })
})
