import { describe, it, expect } from 'vitest'
import { formatDateRange } from './calendar-format'

describe('formatDateRange', () => {
  it('même jour → un seul jour', () => {
    expect(formatDateRange(new Date(2026, 4, 24), new Date(2026, 4, 24))).toBe('24 mai')
  })
  it('même mois → plage de jours', () => {
    expect(formatDateRange(new Date(2026, 4, 24), new Date(2026, 4, 26))).toBe('24-26 mai')
  })
  it('deux mois → plage avec les deux mois', () => {
    expect(formatDateRange(new Date(2026, 4, 30), new Date(2026, 5, 2))).toBe('30 mai — 2 juin')
  })
})
