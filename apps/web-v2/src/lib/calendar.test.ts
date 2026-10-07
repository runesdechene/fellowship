/**
 * QUOI     — tests de lib/calendar.ts : rangement des dates par mois, comptes,
 *            phrase d'en-tête, regroupement des compagnons, fenêtre de la navigation des mois.
 * POURQUOI — la logique du calendrier se teste ici, sans navigateur ; le fuseau est épinglé sur
 *            Europe/Paris par la configuration des tests.
 */
import { describe, expect, it } from 'vitest'
import { monthsWindow } from './dates'
import {
  bucketByStartMonth,
  calendarHeadline,
  countLabel,
  groupCompanions,
  navWindow,
  scrollFromPointer,
} from './calendar'

const d = (iso: string) => new Date(`${iso}T00:00:00`)

describe('countLabel', () => {
  it('dit les dates au singulier, au pluriel, ou leur absence', () => {
    expect(countLabel(0)).toBe('Aucune date')
    expect(countLabel(1)).toBe('1 date')
    expect(countLabel(4)).toBe('4 dates')
  })
})

describe('bucketByStartMonth', () => {
  const months = monthsWindow(3, d('2026-10-07'))
  it('range chaque date dans le mois où elle COMMENCE', () => {
    const items = [
      { id: 'a', startDate: d('2026-10-30') },
      { id: 'b', startDate: d('2026-11-07') },
      { id: 'c', startDate: d('2026-10-25') },
    ]
    const buckets = bucketByStartMonth(items, months)
    expect(buckets.get('2026-10')?.map((i) => i.id)).toEqual(['c', 'a'])
    expect(buckets.get('2026-11')?.map((i) => i.id)).toEqual(['b'])
    expect(buckets.get('2026-12')).toEqual([])
  })
  it('ignore ce qui commence hors de la fenêtre', () => {
    const buckets = bucketByStartMonth([{ id: 'x', startDate: d('2027-05-01') }], months)
    expect([...buckets.values()].flat()).toEqual([])
  })
  it('garde une date déjà commencée dans le mois en cours', () => {
    const buckets = bucketByStartMonth([{ id: 'y', startDate: d('2026-09-28') }], months)
    expect(buckets.get('2026-10')?.map((i) => i.id)).toEqual(['y'])
  })
})

describe('calendarHeadline', () => {
  it('dit le nombre de dates, la fin de la fenêtre et la prochaine', () => {
    expect(calendarHeadline(6, d('2027-09-01'), 18)).toBe(
      '6 dates d’ici septembre 2027 · la prochaine dans 18 jours',
    )
  })
  it('dit « demain » et « aujourd’hui »', () => {
    expect(calendarHeadline(1, d('2027-09-01'), 1)).toBe(
      '1 date d’ici septembre 2027 · la prochaine demain',
    )
    expect(calendarHeadline(2, d('2027-09-01'), 0)).toBe(
      '2 dates d’ici septembre 2027 · la prochaine aujourd’hui',
    )
  })
  it('se tait sur la prochaine quand il n’y en a pas', () => {
    expect(calendarHeadline(0, d('2027-09-01'), null)).toBe('Aucune date d’ici septembre 2027')
  })
})

describe('groupCompanions', () => {
  it('regroupe les amis par festival et écarte ceux où je vais déjà', () => {
    const rows = [
      { eventId: 'e1', friend: { id: 'g', name: 'Gautier', avatarUrl: null } },
      { eventId: 'e1', friend: { id: 'l', name: 'Lina', avatarUrl: null } },
      { eventId: 'e2', friend: { id: 'u', name: 'Uriel', avatarUrl: null } },
      { eventId: 'mine', friend: { id: 'g', name: 'Gautier', avatarUrl: null } },
    ]
    const grouped = groupCompanions(rows, new Set(['mine']))
    expect([...grouped.keys()]).toEqual(['e1', 'e2'])
    expect(grouped.get('e1')?.map((f) => f.name)).toEqual(['Gautier', 'Lina'])
  })
  it('ne compte pas deux fois le même ami sur un festival', () => {
    const rows = [
      { eventId: 'e1', friend: { id: 'g', name: 'Gautier', avatarUrl: null } },
      { eventId: 'e1', friend: { id: 'g', name: 'Gautier', avatarUrl: null } },
    ]
    expect(groupCompanions(rows, new Set()).get('e1')).toHaveLength(1)
  })
})

describe('navWindow', () => {
  it('la fenêtre a la part visible de la frise, à sa place', () => {
    expect(navWindow(0, 4000, 1000)).toEqual({ start: 0, size: 0.25 })
    expect(navWindow(1500, 4000, 1000)).toEqual({ start: 0.375, size: 0.25 })
  })

  it('une frise qui tient entière : la fenêtre couvre tout', () => {
    expect(navWindow(0, 800, 1000)).toEqual({ start: 0, size: 1 })
  })
})

describe('scrollFromPointer', () => {
  it('la frise suit la fenêtre saisie', () => {
    expect(scrollFromPointer(0.5, 0.125, 4000, 1000)).toBe(1500)
  })

  it('la fenêtre reste dans la navigation', () => {
    expect(scrollFromPointer(0.05, 0.125, 4000, 1000)).toBe(0)
    expect(scrollFromPointer(0.99, 0.125, 4000, 1000)).toBe(3000)
  })
})
