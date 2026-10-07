import { describe, it, expect } from 'vitest'
import { buildPastBilans, splitOrientation } from './cockpit-bilans'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'inscrit', orientation = 'payeur'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: 'paye', payment_orientation: orientation, visibility: 'amis',
    events: { id: 'e' + id, name: 'Festival ' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

function entry(eventId: string, amount: number, direction: 'in' | 'out'): LedgerEntry {
  return { event_id: eventId, amount, direction, category: 'autre', source: 'manual' } as unknown as LedgerEntry
}

describe('buildPastBilans', () => {
  it('ne garde que les inscrit passés, tri end_date desc, profit = in - out', () => {
    const parts = [
      part('1', '2026-04-01'),
      part('2', '2026-05-01'),
      part('3', '2026-07-01'),                 // futur → exclu
      part('4', '2026-03-01', 'en_cours'),     // non confirmé → exclu
    ]
    const entries = new Map<string, LedgerEntry[]>([
      ['e2', [entry('e2', 1240, 'in'), entry('e2', 410, 'out'), entry('e2', 350, 'out')]],
    ])
    const out = buildPastBilans(parts, entries, NOW)
    expect(out.map(b => b.participation.id)).toEqual(['2', '1'])
    expect(out[0].profit).toBe(480)           // 1240 - 410 - 350
    expect(out[0].revenueIn).toBe(1240)
    expect(out[1].profit).toBeNull()           // festival '1' sans ligne
  })

  it('liste vide si aucun festival passé', () => {
    expect(buildPastBilans([part('1', '2026-07-01')], new Map(), NOW)).toEqual([])
  })
})

describe('splitOrientation', () => {
  it('somme les cachets reçus et les emplacements payés', () => {
    const parts = [part('1', '2026-04-01', 'inscrit', 'paye'), part('2', '2026-04-02', 'inscrit', 'payeur')]
    const entries = new Map<string, LedgerEntry[]>([
      ['e1', [entry('e1', 500, 'in')]],
      ['e2', [entry('e2', 200, 'out')]],
    ])
    const bilans = buildPastBilans(parts, entries, NOW)
    expect(splitOrientation(bilans)).toEqual({ recu: 500, paye: 200 })
  })
})
