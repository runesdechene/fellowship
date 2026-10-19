/**
 * QUOI     — tests de lib/landing.ts : comment la landing pose l'exposant de démonstration sur les
 *            vrais festivals de Fellowship.
 * POURQUOI — l'assemblage est la seule logique de la landing ; il se teste sans navigateur
 *            (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import {
  buildShowcase,
  paymentOf,
  pickFaces,
  placeOf,
  RUNES_DE_CHENE,
  type ShowcaseRow,
} from './landing'
import { DEMO } from './landing-demo'

const TODAY = new Date(2026, 9, 14)

function row(id: string, start: string, over: Partial<ShowcaseRow> = {}): ShowcaseRow {
  return {
    id,
    name: `Festival ${id}`,
    image_url: `https://img/${id}.jpg`,
    tags: null,
    start_date: start,
    end_date: start,
    city: 'Limoges',
    department: '87',
    created_at: '2026-01-01T10:00:00Z',
    ...over,
  }
}

const none = new Map<string, number>()
const empty = { upcoming: [], registered: none, recent: [], past: [], exhibitors: null, faces: [] }

describe('placeOf', () => {
  it('écrit « Ville (dép.) », ou la ville seule', () => {
    expect(placeOf('Limoges', '87')).toBe('Limoges (87)')
    expect(placeOf('Limoges', '')).toBe('Limoges')
    expect(placeOf('Limoges', null)).toBe('Limoges')
  })

  it('ramène un code postal ou un « Orne (61) » au numéro du département', () => {
    expect(placeOf('Grenoble', '38000')).toBe('Grenoble (38)')
    expect(placeOf('Domfront', 'Orne (61)')).toBe('Domfront (61)')
  })
})

describe('buildShowcase', () => {
  it('rend une landing vide, mais complète, sans aucun festival', () => {
    const show = buildShowcase(empty, TODAY)
    expect(show.wall).toEqual([])
    expect(show.crowd).toBeNull()
    expect(show.exhibitors).toBeNull()
    expect(show.months).toHaveLength(12)
    expect(show.reports).toEqual([])
    expect(show.months.every((m) => m.events.length === 0)).toBe(true)
    expect(show.dossiers).toEqual([])
    expect(show.oneClick).toBeNull()
    expect(show.pdf).toBeNull()
    expect(show.recent).toEqual([])
    expect(show.forYou).toEqual([])
  })

  it('met au mur les affiches à venir, et seulement celles-là', () => {
    const upcoming = [row('a', '2026-10-20'), row('b', '2026-10-21', { image_url: null })]
    expect(buildShowcase({ ...empty, upcoming }, TODAY).wall).toEqual(['https://img/a.jpg'])
  })

  it('choisit le festival le plus suivi, le plus proche à égalité', () => {
    const upcoming = [row('a', '2026-10-20'), row('b', '2026-10-21'), row('c', '2026-10-22')]
    const registered = new Map([
      ['a', 2],
      ['b', 5],
      ['c', 5],
    ])
    const show = buildShowcase({ ...empty, upcoming, registered }, TODAY)
    expect(show.crowd?.event.id).toBe('b')
    expect(show.crowd?.count).toBe(5)
  })

  it('n’a pas de festival « le plus suivi » sans aucun inscrit', () => {
    const show = buildShowcase({ ...empty, upcoming: [row('a', '2026-10-20')] }, TODAY)
    expect(show.crowd).toBeNull()
  })

  it('range le calendrier sur les douze mois du Pro, deux dates montrées, toutes comptées', () => {
    const upcoming = [
      row('o1', '2026-10-20'),
      row('o2', '2026-10-25'),
      row('o3', '2026-10-28'),
      row('d1', '2026-12-05'),
    ]
    const show = buildShowcase({ ...empty, upcoming }, TODAY)
    expect(show.months.map((m) => m.month.getMonth())).toEqual([
      9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8,
    ])
    expect(show.months.slice(0, 4).map((m) => m.events.map((e) => e.id))).toEqual([
      ['o1', 'o2'],
      [],
      ['d1'],
      [],
    ])
    expect(show.months.slice(0, 4).map((m) => m.count)).toEqual([3, 0, 1, 0])
  })

  it('donne à chaque date le statut de la démonstration, le même partout', () => {
    const upcoming = [row('a', '2026-10-20'), row('b', '2026-10-21')]
    const show = buildShowcase({ ...empty, upcoming }, TODAY)
    expect(show.months[0]?.events.map((e) => e.status)).toEqual(DEMO.statuses.slice(0, 2))
    expect(show.dossiers.map((d) => d.status)).toEqual(DEMO.statuses.slice(0, 2))
  })

  it('remplit « Mes dossiers » avec les quatre premières dates et les montants de la démonstration', () => {
    const upcoming = ['a', 'b', 'c', 'd', 'e'].map((id, i) => row(id, `2026-11-0${String(i + 1)}`))
    const show = buildShowcase({ ...empty, upcoming }, TODAY)
    expect(show.dossiers.map((d) => d.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(show.dossiers.map((d) => [d.paid, d.total])).toEqual(
      DEMO.dossiers.slice(0, 4).map((d) => [d.paid, d.total]),
    )
  })

  it('montre l’inscription en un clic sur une date avec affiche, autre que la plus suivie', () => {
    const upcoming = [
      row('a', '2026-10-20'),
      row('b', '2026-10-21', { image_url: null }),
      row('c', '2026-10-22'),
    ]
    const registered = new Map([['a', 3]])
    const show = buildShowcase({ ...empty, upcoming, registered }, TODAY)
    expect(show.oneClick?.id).toBe('c')
    expect(show.pdf?.id).toBe('b')
  })

  it('compte en jours l’ancienneté des derniers festivals ajoutés', () => {
    const recent = [
      row('n', '2027-03-01', { created_at: '2026-10-14T08:00:00Z' }),
      row('m', '2027-04-01', { created_at: '2026-10-11T08:00:00Z' }),
    ]
    const show = buildShowcase({ ...empty, recent }, new Date('2026-10-14T18:00:00Z'))
    expect(show.recent.map((r) => r.daysAgo)).toEqual([0, 3])
  })

  it('propose « Pour toi » trois dates avec affiche, sans répéter la plus suivie', () => {
    const upcoming = ['a', 'b', 'c', 'd', 'e'].map((id, i) => row(id, `2026-11-0${String(i + 1)}`))
    const registered = new Map([['a', 4]])
    const show = buildShowcase({ ...empty, upcoming, registered }, TODAY)
    expect(show.forYou).toHaveLength(3)
    expect(show.forYou.map((e) => e.id)).not.toContain('a')
  })
})

describe('pickFaces', () => {
  const rdc = { actor_id: RUNES_DE_CHENE, avatar_url: 'rdc' }
  const others = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ actor_id: id, avatar_url: id }))
  const people = [...others.slice(0, 3), rdc, ...others.slice(3)]

  it('pose Runes de Chêne en premier, puis quatre autres avatars différents', () => {
    const faces = pickFaces(people, Math.random)
    expect(faces).toHaveLength(5)
    expect(faces[0]).toBe('rdc')
    expect(new Set(faces).size).toBe(5)
  })

  it('tire les quatre autres au hasard', () => {
    expect(pickFaces(people, () => 0)).not.toEqual(pickFaces(people, () => 0.99))
  })

  it('rend ce qu’il y a quand la base en a peu, et rien sans avatar', () => {
    expect(pickFaces(others.slice(0, 2), Math.random).sort()).toEqual(['a', 'b'])
    expect(pickFaces([], Math.random)).toEqual([])
  })
})

describe('les bilans de la démonstration', () => {
  it('posent les montants de la démonstration sur les dernières dates passées', () => {
    const past = [row('p1', '2026-09-20'), row('p2', '2026-09-06'), row('p3', '2026-08-15')]
    const show = buildShowcase({ ...empty, past }, TODAY)
    expect(show.reports.map((r) => r.id)).toEqual(['p1', 'p2', 'p3'])
    expect(show.reports.map((r) => r.net)).toEqual(DEMO.reports.map((r) => r?.net ?? null))
  })
})

describe('paymentOf', () => {
  it('dit où en est l’argent d’un dossier', () => {
    expect(paymentOf(450, 450).label).toBe('Payé')
    expect(paymentOf(150, 450).label).toBe('Acompte versé')
    expect(paymentOf(0, 320).label).toBe('À payer')
  })
})
