import { describe, it, expect } from 'vitest'
import { canReport, formatReason, REPORT_REASONS } from './content-reports'

describe('canReport', () => {
  const me = { id: 'me-id' }
  it('false si pas connecté', () => {
    expect(canReport(null, { type: 'event', ownerId: 'other' })).toBe(false)
  })
  it('false si target appartient au reporter', () => {
    expect(canReport(me, { type: 'event', ownerId: 'me-id' })).toBe(false)
  })
  it('true si connecté et target appartient à autre', () => {
    expect(canReport(me, { type: 'event', ownerId: 'other' })).toBe(true)
  })
  it('true si ownerId est null (event sans créateur identifié)', () => {
    expect(canReport(me, { type: 'event', ownerId: null })).toBe(true)
  })
})

describe('formatReason', () => {
  it('mappe spam', () => {
    expect(formatReason('spam')).toBe('Spam ou promotion abusive')
  })
  it('mappe inapproprie', () => {
    expect(formatReason('inapproprie')).toBe('Contenu inapproprié')
  })
  it('mappe info_erronee', () => {
    expect(formatReason('info_erronee')).toBe('Information erronée')
  })
  it('mappe doublon', () => {
    expect(formatReason('doublon')).toBe('Doublon (déjà existant)')
  })
  it('fallback sur la valeur brute si inconnue', () => {
    expect(formatReason('xyz')).toBe('xyz')
  })
})

describe('REPORT_REASONS', () => {
  it('expose les 4 raisons dans l\'ordre canonique', () => {
    expect(REPORT_REASONS.map(r => r.value)).toEqual(['spam', 'inapproprie', 'info_erronee', 'doublon'])
  })
})
