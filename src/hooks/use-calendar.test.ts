import { describe, it, expect } from 'vitest'
import { buildCalendarMonths } from './use-calendar'
import type { ParticipationWithEvent } from '@/types/database'

const part = (over: Omit<Partial<ParticipationWithEvent>, 'events'> & { events: Record<string, unknown> }): ParticipationWithEvent => ({
  id: 'p1', actor_id: 'a1', event_id: 'e1', status: 'inscrit', visibility: 'public',
  payment_status: 'a_payer', payments: null, created_at: '2026-01-01',
  ...over,
} as unknown as ParticipationWithEvent)

describe('buildCalendarMonths', () => {
  it('propage payment_status dans CalendarEvent', () => {
    const p = part({ events: { id: 'e1', name: 'Salon', start_date: '2026-03-10', end_date: '2026-03-11', city: 'Lyon', department: '69', tags: ['salon'], image_url: null } })
    const months = buildCalendarMonths([p], 2026)
    const ev = months[2].events[0]
    expect(ev.paymentStatus).toBe('a_payer')
    expect(ev.status).toBe('inscrit')
  })

  it('paymentStatus null si absent', () => {
    const p = part({ payment_status: null, events: { id: 'e1', name: 'X', start_date: '2026-05-01', end_date: '2026-05-01', city: 'Paris', department: '75', tags: [], image_url: null } })
    const months = buildCalendarMonths([p], 2026)
    expect(months[4].events[0].paymentStatus).toBeNull()
  })
})
