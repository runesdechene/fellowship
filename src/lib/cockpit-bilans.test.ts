import { describe, it, expect } from 'vitest'
import { bilanProfit, buildPastBilans } from './cockpit-bilans'
import type { ParticipationWithEvent, EventReport } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(id: string, end: string, status = 'inscrit'): ParticipationWithEvent {
  return {
    id, event_id: 'e' + id, status, payment_status: 'paye', visibility: 'amis',
    events: { id: 'e' + id, name: 'Festival ' + id, start_date: end, end_date: end, city: 'Lyon', department: '69', image_url: null, tags: ['medieval'] },
  } as unknown as ParticipationWithEvent
}

function report(eventId: string, revenue: number, booth: number, charges: number): EventReport {
  return { event_id: eventId, revenue, booth_cost: booth, charges } as unknown as EventReport
}

describe('bilanProfit', () => {
  it('revenue - booth_cost - charges, null traités comme 0', () => {
    expect(bilanProfit({ revenue: 1000, booth_cost: 300, charges: 220 })).toBe(480)
    expect(bilanProfit({ revenue: null, booth_cost: null, charges: null })).toBe(0)
  })
})

describe('buildPastBilans', () => {
  it('ne garde que les inscrit passés, tri end_date desc, joint le report + profit', () => {
    const parts = [
      part('1', '2026-04-01'),                 // passé
      part('2', '2026-05-01'),                 // passé, plus récent
      part('3', '2026-07-01'),                 // futur → exclu
      part('4', '2026-03-01', 'en_cours'),     // non confirmé → exclu
    ]
    const reports = new Map<string, EventReport>([['e2', report('e2', 1240, 410, 350)]])
    const out = buildPastBilans(parts, reports, NOW)
    expect(out.map(b => b.participation.id)).toEqual(['2', '1'])
    expect(out[0].report?.event_id).toBe('e2')
    expect(out[0].profit).toBe(480)
    expect(out[1].report).toBeNull()      // festival '1' non bilané
    expect(out[1].profit).toBeNull()
  })

  it('liste vide si aucun festival passé', () => {
    expect(buildPastBilans([part('1', '2026-07-01')], new Map(), NOW)).toEqual([])
  })
})
