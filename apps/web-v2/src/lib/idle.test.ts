/**
 * QUOI     — tests de lib/idle.ts.
 * POURQUOI — la frontière des 15 minutes décide quand la clé quitte la mémoire.
 */
import { describe, expect, it } from 'vitest'
import { IDLE_LIMIT_MS, isIdle } from './idle'

describe('isIdle', () => {
  const start = Date.UTC(2026, 9, 31, 12)

  it('reste ouvert avant 15 minutes', () => {
    expect(isIdle(start, start)).toBe(false)
    expect(isIdle(start, start + IDLE_LIMIT_MS - 1)).toBe(false)
  })

  it('verrouille à 15 minutes pile et au-delà', () => {
    expect(IDLE_LIMIT_MS).toBe(900_000)
    expect(isIdle(start, start + IDLE_LIMIT_MS)).toBe(true)
    expect(isIdle(start, start + 3 * IDLE_LIMIT_MS)).toBe(true)
  })
})
