/**
 * QUOI     — tests de lib/report-writes.ts et du chemin d'une photo (lib/report-media.ts).
 * POURQUOI — l'effacement d'un bilan ne doit jamais toucher au prix de Mon dossier.
 */
import { describe, expect, it } from 'vitest'
import { addTag, clearReportPlan, directionOf } from './report-writes'
import { reportPhotoPath } from './report-media'

describe('directionOf', () => {
  it('les ventes, le cachet et un remboursement entrent', () => {
    expect(directionOf('ventes')).toBe('in')
    expect(directionOf('cachet')).toBe('in')
    expect(directionOf('remboursement')).toBe('in')
  })
  it('le reste sort', () => {
    expect(directionOf('essence')).toBe('out')
    expect(directionOf('autre')).toBe('out')
  })
})

describe('clearReportPlan', () => {
  it('ne vise que les lignes saisies dans le bilan, et garde la ligne event_reports', () => {
    const plan = clearReportPlan('r1')
    expect(plan.deleteLines).toEqual({ report_id: 'r1', source: 'manual' })
    expect(plan.resetReport).toEqual({ wins: [], improvements: [], note: null, media_paths: [] })
  })
})

describe('addTag', () => {
  it('ajoute une étiquette nettoyée', () => {
    expect(addTag(['Stand en angle'], '  Public familial ')).toEqual([
      'Stand en angle',
      'Public familial',
    ])
  })
  it('ignore le vide et les doublons, sans regarder la casse', () => {
    expect(addTag(['Stand en angle'], '   ')).toEqual(['Stand en angle'])
    expect(addTag(['Stand en angle'], 'stand EN angle')).toEqual(['Stand en angle'])
  })
})

describe('reportPhotoPath', () => {
  it('range la photo sous l’acteur puis l’événement — la policy du bucket lit le premier dossier', () => {
    expect(reportPhotoPath('a1', 'e1', 'u1', 'webp')).toBe('a1/e1/u1.webp')
  })
})
