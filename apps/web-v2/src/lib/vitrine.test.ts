/**
 * QUOI     — les tests de la logique pure de la vitrine (lib/vitrine.ts).
 * POURQUOI — les libellés de la vitrine se lisent par des inconnus : un pluriel faux ou un nom de
 *            tampon mal coupé s'y voit tout de suite.
 */
import { describe, expect, it } from 'vitest'
import { initials, meetLine, networkCounts, splitRoad, stampName, websiteLink } from './vitrine'

const d = (iso: string) => new Date(`${iso}T00:00:00`)

describe('stampName', () => {
  it('retire l’article de tête', () => {
    expect(stampName('Les Aventuriales')).toBe('Aventuriales')
    expect(stampName('La Fête des Fous')).toBe('Fête des Fous')
    expect(stampName('L’Isle sur la Sorgue')).toBe('Isle sur la Sorgue')
    expect(stampName("L'Isle sur la Sorgue")).toBe('Isle sur la Sorgue')
  })

  it('retire l’année et l’édition qui traînent à la fin', () => {
    expect(stampName('Art to Play 2026')).toBe('Art to Play')
    expect(stampName('Hellfest 2025 - Édition XII')).toBe('Hellfest')
  })

  it('garde un nom sans article tel quel', () => {
    expect(stampName('Plane’R Fest')).toBe('Plane’R Fest')
  })
})

describe('meetLine', () => {
  it('un ami : le verbe au singulier', () => {
    expect(meetLine(['Gautier'])).toEqual({ first: 'Gautier', rest: ' t’y retrouve' })
  })

  it('deux amis : le second nommé', () => {
    expect(meetLine(['Gautier', 'Uriel'])).toEqual({
      first: 'Gautier',
      rest: ' et Uriel t’y retrouvent',
    })
  })

  it('au-delà : on compte les autres', () => {
    expect(meetLine(['Gautier', 'Uriel', 'Iva'])).toEqual({
      first: 'Gautier',
      rest: ' et 2 autres t’y retrouvent',
    })
  })

  it('personne : rien', () => {
    expect(meetLine([])).toBeNull()
  })
})

describe('networkCounts', () => {
  it('accorde les deux compteurs', () => {
    expect(networkCounts(128, 14)).toEqual([
      { count: 128, label: 'abonnés' },
      { count: 14, label: 'compagnons exposants' },
    ])
    expect(networkCounts(1, 1)).toEqual([
      { count: 1, label: 'abonné' },
      { count: 1, label: 'compagnon exposant' },
    ])
    expect(networkCounts(0, 0)).toEqual([
      { count: 0, label: 'abonné' },
      { count: 0, label: 'compagnon exposant' },
    ])
  })
})

describe('splitRoad', () => {
  const today = d('2026-10-07')
  const item = (start: string, end: string) => ({ startDate: d(start), endDate: d(end) })

  it('une date en cours est encore à venir', () => {
    const { upcoming, past } = splitRoad([item('2026-10-06', '2026-10-08')], today)
    expect(upcoming).toHaveLength(1)
    expect(past).toHaveLength(0)
  })

  it('à venir du plus proche au plus loin, passé du plus récent au plus ancien', () => {
    const { upcoming, past } = splitRoad(
      [
        item('2026-12-05', '2026-12-06'),
        item('2024-06-01', '2024-06-02'),
        item('2026-10-25', '2026-10-27'),
        item('2025-03-01', '2025-03-02'),
      ],
      today,
    )
    expect(upcoming.map((e) => e.startDate.getMonth())).toEqual([9, 11])
    expect(past.map((e) => e.startDate.getFullYear())).toEqual([2025, 2024])
  })
})

describe('initials', () => {
  it('prend la première lettre des deux premiers mots (les signes comme « & » ne comptent pas)', () => {
    expect(initials('Atelier Corne & Cuir')).toBe('AC')
    expect(initials('runes de chêne')).toBe('RD')
    expect(initials('Sylak')).toBe('S')
  })
})

describe('websiteLink', () => {
  it('affiche l’hôte nu et garde une adresse cliquable', () => {
    expect(websiteLink('https://www.corneetcuir.fr/')).toEqual({
      href: 'https://www.corneetcuir.fr/',
      label: 'corneetcuir.fr',
    })
    expect(websiteLink('corneetcuir.fr')).toEqual({
      href: 'https://corneetcuir.fr',
      label: 'corneetcuir.fr',
    })
  })
})
