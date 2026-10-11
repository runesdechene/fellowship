/**
 * QUOI     — tests des phrases de la création : la ligne d'un doublon, le lieu et les dates de
 *            l'aperçu.
 * POURQUOI — lot 10b : « 12 exposants inscrits » ou « Passé » décide si l'on ouvre un festival
 *            existant ou si l'on en crée un second.
 */
import { describe, expect, test } from 'vitest'
import { duplicateLine, previewPlace } from './create-event'

const today = new Date(2026, 9, 11)
const row = { startDate: '2027-04-04', endDate: '2027-04-05', city: 'Provins', department: '77' }

describe('duplicateLine', () => {
  test('à venir : les dates, le lieu, les inscrits', () => {
    const line = duplicateLine({ ...row, exhibitors: 12 }, today)
    expect(line.past).toBe(false)
    expect(line.meta).toMatch(/Provins \(77\) · 12 exposants inscrits$/)
  })
  test('un seul inscrit, aucun inscrit', () => {
    expect(duplicateLine({ ...row, exhibitors: 1 }, today).meta).toMatch(/1 exposant inscrit$/)
    expect(duplicateLine({ ...row, exhibitors: 0 }, today).meta).toMatch(/Provins \(77\)$/)
  })
  test('terminé : « Passé » à la place des inscrits', () => {
    const line = duplicateLine(
      { ...row, startDate: '2026-06-13', endDate: '2026-06-14', exhibitors: 30 },
      today,
    )
    expect(line.past).toBe(true)
    expect(line.meta).toMatch(/Provins \(77\) · Passé$/)
  })
})

describe('previewPlace', () => {
  test('les dates et le lieu, ou rien tant qu’il manque l’un', () => {
    expect(
      previewPlace({
        startDate: '2026-09-25',
        endDate: '2026-09-27',
        city: 'Ménétrol',
        department: '63',
      }),
    ).toMatch(/Ménétrol \(63\)$/)
    expect(
      previewPlace({ startDate: '', endDate: '', city: 'Ménétrol', department: '63' }),
    ).toBeNull()
    expect(
      previewPlace({ startDate: '2026-09-25', endDate: '', city: '', department: '' }),
    ).toBeNull()
  })
})
