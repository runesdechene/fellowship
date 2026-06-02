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
  // NOW = 2026-05-15 → la fenêtre glissante démarre en mai 2026 (mois courant).
  it('frise glissante de 12 mois depuis le mois courant, confirmés uniquement', () => {
    const parts = [
      part('1', '2026-05-20', '2026-05-21'),               // mai 2026 → idx 0
      part('2', '2026-07-01', '2026-07-02'),               // juillet 2026 → idx 2
      part('3', '2027-01-10', '2027-01-11'),               // janvier 2027 → idx 8 (rollover année)
      part('4', '2026-06-01', '2026-06-02', 'en_cours', 'a_payer'), // non confirmé → ignoré
      part('5', '2026-03-10', '2026-03-11'),               // mars 2026 = passé → hors fenêtre
    ]
    const season = aggregateSeason(parts, NOW)
    expect(season).toHaveLength(12)
    expect(season[0]).toEqual({ year: 2026, month: 4, count: 1, filled: true })   // mai
    expect(season[2]).toEqual({ year: 2026, month: 6, count: 1, filled: true })   // juillet
    expect(season[8]).toEqual({ year: 2027, month: 0, count: 1, filled: true })   // janvier 2027
    expect(season[1]).toEqual({ year: 2026, month: 5, count: 0, filled: false })  // juin (en_cours ignoré)
    // Aucun mois passé (mars) n'apparaît : le 1er mois est toujours le mois courant.
    expect(season.every(m => !(m.year === 2026 && m.month < 4))).toBe(true)
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

  it('ignore un festival terminé hors fenêtre de récence (trop vieux)', () => {
    // Terminé ~4 mois avant NOW, jamais bilané → ne doit PAS harceler.
    const parts = [part('1', '2026-01-10', '2026-01-12')]
    expect(detectBilanPrompt(parts, new Set(), NOW).pending).toBeNull()
  })
})
