import { describe, it, expect } from 'vitest'
import {
  selectNextFestival,
  selectUpcomingFestivals,
  selectAReglerItems,
  aggregateSeason,
  detectBilanPrompt,
} from './cockpit'
import type { ParticipationWithEvent } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(
  id: string,
  start: string,
  end: string,
  status = 'inscrit',
  payment: string | null = 'paye',
): ParticipationWithEvent {
  return {
    id,
    event_id: 'e' + id,
    status,
    payment_status: payment,
    visibility: 'amis',
    events: {
      id: 'e' + id, name: 'Festival ' + id, start_date: start, end_date: end,
      city: 'Lyon', department: '69', image_url: null, tags: ['medieval'],
    },
  } as unknown as ParticipationWithEvent
}

describe('selectNextFestival', () => {
  it('retourne la prochaine participation confirmée (inscrit), la plus proche', () => {
    const parts = [
      part('1', '2026-07-10', '2026-07-12'),
      part('2', '2026-06-01', '2026-06-02'),
    ]
    expect(selectNextFestival(parts, NOW)?.id).toBe('2')
  })

  it('ignore les candidatures (en_cours) et les repérés (interesse)', () => {
    const parts = [
      part('1', '2026-06-01', '2026-06-02', 'en_cours', 'a_payer'),
      part('2', '2026-06-10', '2026-06-11', 'interesse', null),
      part('3', '2026-08-01', '2026-08-02', 'inscrit', 'paye'),
    ]
    expect(selectNextFestival(parts, NOW)?.id).toBe('3')
  })

  it('ignore les festivals terminés et retourne null si aucun confirmé à venir', () => {
    const parts = [part('1', '2026-01-01', '2026-01-02')]
    expect(selectNextFestival(parts, NOW)).toBeNull()
  })
})

describe('selectUpcomingFestivals', () => {
  it('garde inscrit + en_cours à venir, exclut interesse/refuse/passé, tri croissant', () => {
    const parts = [
      part('1', '2026-08-01', '2026-08-02', 'inscrit', 'paye'),
      part('2', '2026-06-01', '2026-06-02', 'en_cours', 'a_payer'),
      part('3', '2026-07-01', '2026-07-02', 'interesse', null),
      part('4', '2026-07-15', '2026-07-16', 'refuse', null),
      part('5', '2026-01-01', '2026-01-02', 'inscrit', 'paye'),
    ]
    expect(selectUpcomingFestivals(parts, NOW).map(p => p.id)).toEqual(['2', '1'])
  })
})

describe('selectAReglerItems', () => {
  it('garde inscrit non payé (a_payer/acompte_verse) + en_cours, exclut inscrit payé', () => {
    const parts = [
      part('1', '2026-06-01', '2026-06-02', 'inscrit', 'a_payer'),
      part('2', '2026-06-05', '2026-06-06', 'inscrit', 'acompte_verse'),
      part('3', '2026-06-10', '2026-06-11', 'inscrit', 'paye'),
      part('4', '2026-06-15', '2026-06-16', 'en_cours', null),
    ]
    expect(selectAReglerItems(parts, NOW).map(p => p.id)).toEqual(['1', '2', '4'])
  })
})

describe('aggregateSeason', () => {
  it('compte les confirmés (inscrit) par mois de l\'année, 12 entrées, filled si > 0', () => {
    const parts = [
      part('1', '2026-03-10', '2026-03-11'),
      part('2', '2026-03-20', '2026-03-21'),
      part('3', '2026-07-01', '2026-07-02'),
      part('4', '2026-04-01', '2026-04-02', 'en_cours', 'a_payer'), // non confirmé → ignoré
      part('5', '2025-03-01', '2025-03-02'), // autre année → ignoré
    ]
    const season = aggregateSeason(parts, 2026)
    expect(season).toHaveLength(12)
    expect(season[2]).toEqual({ month: 2, count: 2, filled: true })  // mars
    expect(season[6]).toEqual({ month: 6, count: 1, filled: true })  // juillet
    expect(season[3]).toEqual({ month: 3, count: 0, filled: false }) // avril (en_cours ignoré)
  })
})

describe('detectBilanPrompt', () => {
  it('retourne le festival terminé confirmé non bilané le plus récent + le reste en extraCount', () => {
    const parts = [
      part('1', '2026-04-01', '2026-04-02'),  // terminé, non bilané
      part('2', '2026-05-01', '2026-05-02'),  // terminé, plus récent, non bilané
      part('3', '2026-03-01', '2026-03-02'),  // terminé, déjà bilané
      part('4', '2026-07-01', '2026-07-02'),  // à venir → ignoré
    ]
    const reported = new Set(['e3'])
    const res = detectBilanPrompt(parts, reported, NOW)
    expect(res.pending?.id).toBe('2')
    expect(res.extraCount).toBe(1) // le festival '1' restant
  })

  it('retourne pending null quand tout est bilané ou rien de terminé', () => {
    const parts = [part('1', '2026-07-01', '2026-07-02')]
    expect(detectBilanPrompt(parts, new Set(), NOW).pending).toBeNull()
  })
})
