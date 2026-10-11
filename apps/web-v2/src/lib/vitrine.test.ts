/**
 * QUOI     — les tests de la logique pure de la vitrine (lib/vitrine.ts).
 * POURQUOI — les libellés de la vitrine se lisent par des inconnus : un pluriel faux ou un nom de
 *            tampon mal coupé s'y voit tout de suite.
 */
import { describe, expect, it } from 'vitest'
import { initials, networkCounts, splitRoad, stampName, vitrineLinks, websiteLink } from './vitrine'

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

describe('vitrineLinks', () => {
  it('lit les liens valides, trois au plus, et ignore les mal formés', () => {
    const raw = [
      { type: 'shop', url: 'https://la-bete.sumupstore.com/', label: 'Boutique' },
      { type: 'instagram', url: 'https://instagram.com/x', label: '@x' },
      { url: 'https://sans-type.fr' },
      'x',
      { type: 'website', url: 'https://a.fr', label: 'a.fr' },
      { type: 'website', url: 'https://b.fr', label: 'b.fr' },
    ]
    expect(vitrineLinks(raw, null).map((link) => link.url)).toEqual([
      'https://la-bete.sumupstore.com/',
      'https://instagram.com/x',
      'https://a.fr',
    ])
  })
  it('sans liens, le site hérité de la V1', () => {
    expect(vitrineLinks([], 'runesdechene.com')).toEqual([
      { type: 'website', url: 'https://runesdechene.com', label: 'runesdechene.com' },
    ])
    expect(vitrineLinks(null, null)).toEqual([])
  })
  it('écarte un lien qui n’est pas une adresse web : il finirait dans un href', () => {
    const raw = [
      { type: 'website', url: 'javascript:alert(1)', label: 'x' },
      { type: 'shop', url: 'data:text/html,x', label: 'x' },
      { type: 'website', url: 'https://a.fr', label: 'a.fr' },
    ]
    expect(vitrineLinks(raw, null).map((link) => link.url)).toEqual(['https://a.fr'])
  })
})
