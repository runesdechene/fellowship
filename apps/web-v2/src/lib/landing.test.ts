/**
 * QUOI     — tests de lib/landing.ts : quelles dates la landing montre, dans quel ordre, avec
 *            quelle pastille.
 * POURQUOI — la sélection est la seule logique de la landing ; elle se teste sans navigateur
 *            (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { pickNextFestivals, type LandingEventRow } from './landing'

const TODAY = new Date(2026, 9, 14)
const OLD = '2026-01-01T10:00:00Z'

function row(id: string, start: string, over: Partial<LandingEventRow> = {}): LandingEventRow {
  return {
    id,
    name: `Festival ${id}`,
    image_url: `https://img/${id}.jpg`,
    tags: null,
    start_date: start,
    end_date: start,
    city: 'Limoges',
    department: '87',
    created_at: OLD,
    ...over,
  }
}

const none = new Map<string, number>()

describe('pickNextFestivals', () => {
  it('garde les cinq premières, dans l’ordre des dates', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => row(id, `2026-11-0${i + 1}`))
    expect(pickNextFestivals(rows, none, TODAY).map((f) => f.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('préfère les dates qui ont une affiche, puis les remet dans l’ordre des dates', () => {
    const rows = [
      row('sans', '2026-11-01', { image_url: null }),
      ...['a', 'b', 'c', 'd', 'e'].map((id, i) => row(id, `2026-11-1${i}`)),
    ]
    expect(pickNextFestivals(rows, none, TODAY).map((f) => f.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('complète avec des dates sans affiche s’il en manque', () => {
    const rows = [row('a', '2026-11-01'), row('sans', '2026-11-02', { image_url: null })]
    expect(pickNextFestivals(rows, none, TODAY).map((f) => f.id)).toEqual(['a', 'sans'])
  })

  it('rend une liste vide sans date', () => {
    expect(pickNextFestivals([], none, TODAY)).toEqual([])
  })

  it('écrit le lieu « Ville (dép.) », ou la ville seule', () => {
    const [avec, sans] = pickNextFestivals(
      [row('a', '2026-11-01'), row('b', '2026-11-02', { department: '' })],
      none,
      TODAY,
    )
    expect(avec?.place).toBe('Limoges (87)')
    expect(sans?.place).toBe('Limoges')
  })

  it('« Populaire » va à la date la plus suivie, à partir de trois inscrits', () => {
    const rows = [row('a', '2026-11-01'), row('b', '2026-11-02')]
    const picked = pickNextFestivals(
      rows,
      new Map([
        ['a', 2],
        ['b', 3],
      ]),
      TODAY,
    )
    expect(picked.map((f) => f.badge)).toEqual([null, 'Populaire'])
  })

  it('pas de « Populaire » sous trois inscrits', () => {
    const picked = pickNextFestivals([row('a', '2026-11-01')], new Map([['a', 2]]), TODAY)
    expect(picked[0]?.badge).toBeNull()
  })

  it('à égalité, « Populaire » va à la plus proche', () => {
    const rows = [row('a', '2026-11-01'), row('b', '2026-11-02')]
    const picked = pickNextFestivals(
      rows,
      new Map([
        ['a', 4],
        ['b', 4],
      ]),
      TODAY,
    )
    expect(picked.map((f) => f.badge)).toEqual(['Populaire', null])
  })

  it('« Nouveau » pour une date ajoutée il y a moins de quatorze jours, sauf si elle est populaire', () => {
    const recent = '2026-10-10T10:00:00Z'
    const rows = [
      row('a', '2026-11-01', { created_at: recent }),
      row('b', '2026-11-02', { created_at: recent }),
    ]
    const picked = pickNextFestivals(rows, new Map([['b', 5]]), TODAY)
    expect(picked.map((f) => f.badge)).toEqual(['Nouveau', 'Populaire'])
  })
})
