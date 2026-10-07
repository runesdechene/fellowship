import { describe, it, expect } from 'vitest'
import { candidatureState, mapsSearchUrl, daysUntilStart, hasPracticalInfo, hasApplyInfo, editionLabel } from './festival'
import type { Event } from '@/types/database'

const base = (o: Partial<Event> = {}): Event => ({
  id: '1', name: 'Médiévales de Pérouges', city: 'Pérouges', department: '01',
  start_date: '2026-09-05', end_date: '2026-09-06',
  description: null, image_url: null, tags: ['Médiéval'],
  contact_email: null, registration_url: null, external_url: null,
  registration_deadline: null, registration_note: null,
  created_at: '', created_by_actor: null, acted_by_user_id: null,
  edition: null, opening_hours: null, expected_attendance: null, stand_size: null, stand_price: null,
  ...o,
} as Event)

describe('candidatureState', () => {
  const now = new Date('2026-06-01')
  it('open when deadline in future', () => {
    expect(candidatureState(base({ registration_deadline: '2026-06-30', end_date: '2026-09-06' }), now)).toBe('open')
  })
  it('closed when deadline passed but event future', () => {
    expect(candidatureState(base({ registration_deadline: '2026-05-01', end_date: '2026-09-06' }), now)).toBe('closed')
  })
  it('null when no deadline', () => {
    expect(candidatureState(base({ registration_deadline: null }), now)).toBeNull()
  })
  it('null when event is past', () => {
    expect(candidatureState(base({ registration_deadline: '2026-06-30', end_date: '2026-05-01' }), now)).toBeNull()
  })
})

describe('mapsSearchUrl', () => {
  it('encodes name + city + department', () => {
    const url = mapsSearchUrl(base())
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=')
    expect(url).toContain(encodeURIComponent('Médiévales de Pérouges Pérouges 01'))
  })
})

describe('daysUntilStart', () => {
  it('returns positive count for future', () => {
    expect(daysUntilStart(base({ start_date: '2026-09-05' }), new Date('2026-09-01'))).toBe(4)
  })
  it('returns null for past start', () => {
    expect(daysUntilStart(base({ start_date: '2026-05-01' }), new Date('2026-06-01'))).toBeNull()
  })
})

describe('hasPracticalInfo', () => {
  it('false when only mandatory dates/lieu', () => {
    expect(hasPracticalInfo(base())).toBe(false)
  })
  it('true when an optional field is filled', () => {
    expect(hasPracticalInfo(base({ opening_hours: '10h–19h' }))).toBe(true)
  })
})

describe('hasApplyInfo', () => {
  it('false when no email/url/note', () => {
    expect(hasApplyInfo(base())).toBe(false)
  })
  it('true with contact_email', () => {
    expect(hasApplyInfo(base({ contact_email: 'a@b.fr' }))).toBe(true)
  })
})

describe('editionLabel', () => {
  it('formats ordinal in French', () => {
    expect(editionLabel(21)).toBe('21ᵉ édition')
    expect(editionLabel(1)).toBe('1ʳᵉ édition')
    expect(editionLabel(null)).toBeNull()
  })
})
