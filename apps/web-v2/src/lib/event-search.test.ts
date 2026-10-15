/**
 * QUOI     — les tests de lib/event-search.ts : la mise en forme d'une ligne d'événement.
 * POURQUOI — la carte publique et l'Explorer lisent les mêmes champs : une date mal lue décale
 *            toute une grille.
 */
import { describe, expect, it } from 'vitest'
import { toSearchEvent } from './event-search'

describe('toSearchEvent', () => {
  const row = {
    id: 'e1',
    name: 'Salon du tatouage',
    image_url: null,
    tags: ['salon'],
    start_date: '2026-10-17',
    end_date: '2026-10-18',
    city: 'Clermont-Ferrand',
    department: '63',
    created_at: '2026-10-14T09:00:00Z',
  }

  it('lit les dates en jours locaux et garde le lieu', () => {
    const event = toSearchEvent(row, new Date(2026, 9, 15))
    expect(event.startDate).toEqual(new Date(2026, 9, 17))
    expect(event.endDate).toEqual(new Date(2026, 9, 18))
    expect(event.city).toBe('Clermont-Ferrand')
    expect(event.imageUrl).toBeNull()
  })

  it('« Nouveau » suit isRecent', () => {
    expect(toSearchEvent(row, new Date(2026, 9, 15)).isNew).toBe(true)
    expect(toSearchEvent(row, new Date(2027, 0, 15)).isNew).toBe(false)
  })
})
