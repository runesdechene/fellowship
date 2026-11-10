/**
 * QUOI     — tests de lib/report-writes.ts et du chemin d'une photo (lib/report-media.ts).
 * POURQUOI — l'effacement d'un bilan ne doit jamais toucher au prix de Mon dossier.
 */
import { describe, expect, it } from 'vitest'
import {
  addTag,
  addableCategories,
  clearDatesToSeal,
  clearReportPlan,
  directionOf,
  encryptsByDefault,
  mergeRevenue,
  ordersOf,
  removeTag,
  revenueRegime,
  showsRevenueBanner,
} from './report-writes'
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

describe('addableCategories', () => {
  it('ne propose aucune recette en clair sur une date chiffrée', () => {
    const values = addableCategories(true).map((entry) => entry.value)
    expect(values).not.toContain('ventes')
    expect(values).toContain('autre')
    expect(addableCategories(true).every((entry) => entry.direction === 'out')).toBe(true)
  })

  it('propose tout sur une date en clair', () => {
    expect(addableCategories(false).map((entry) => entry.value)).toContain('ventes')
  })

  it('ne propose jamais les commandes sûres : elles ont leur ligne fixe', () => {
    expect(addableCategories(false).map((entry) => entry.value)).not.toContain('commande_sure')
  })
})

describe('ordersOf', () => {
  const sure = { category: 'commande_sure', amount: 300 }
  it('date en clair : la ligne du registre et la colonne', () => {
    expect(ordersOf(undefined, [sure], 200)).toEqual({ sures: 300, potentielles: 200 })
    expect(ordersOf(undefined, [], null)).toEqual({ sures: 0, potentielles: 0 })
  })
  it('date déchiffrée : le message scellé', () => {
    const secret = { carte: 1, especes: 2, sures: 40, potentielles: 50 }
    expect(ordersOf(secret, [], null)).toEqual({ sures: 40, potentielles: 50 })
  })
})

describe('revenueRegime', () => {
  it('une date qui a des commandes potentielles en clair reste en clair', () => {
    expect(revenueRegime('none', [], 'open', 200).encrypted).toBe(false)
  })
  it('une date vide d’une enseigne verrouillée est masquée', () => {
    expect(revenueRegime('none', [], 'locked', 0)).toEqual({
      byDefault: true,
      masked: true,
      encrypted: true,
    })
  })
  it('sans phrase : en clair', () => {
    expect(revenueRegime('none', [], 'none', 0).encrypted).toBe(false)
  })
})

describe('clearReportPlan', () => {
  it('ne vise que les lignes saisies dans le bilan, et garde la ligne event_reports', () => {
    const plan = clearReportPlan('r1')
    expect(plan.deleteLines).toEqual({ report_id: 'r1', source: 'manual' })
    expect(plan.resetReport).toEqual({
      wins: [],
      improvements: [],
      note: null,
      media_paths: [],
      potential_orders: null,
    })
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

describe('removeTag', () => {
  it('retire l’étiquette sans toucher aux autres', () => {
    expect(removeTag(['Stand en angle', 'Public familial'], 'Stand en angle')).toEqual([
      'Public familial',
    ])
  })
  it('une étiquette déjà retirée ne change rien', () => {
    expect(removeTag(['Public familial'], 'Stand en angle')).toEqual(['Public familial'])
  })
})

describe('reportPhotoPath', () => {
  it('range la photo sous l’acteur puis l’événement — la policy du bucket lit le premier dossier', () => {
    expect(reportPhotoPath('a1', 'e1', 'u1', 'webp')).toBe('a1/e1/u1.webp')
  })
})

describe('encryptsByDefault', () => {
  const sale = { direction: 'in' as const, source: 'manual' }
  const fee = { direction: 'in' as const, source: 'stepper' }
  const fuel = { direction: 'out' as const, source: 'manual' }

  it('un bilan neuf d’une enseigne qui a sa phrase se chiffre d’office, ouverte ou non', () => {
    expect(encryptsByDefault('none', [], 'open', 0)).toBe(true)
    expect(encryptsByDefault('none', [fuel, fee], 'locked', 0)).toBe(true)
  })
  it('des recettes saisies en clair gardent le bilan tel quel', () => {
    expect(encryptsByDefault('none', [sale, fuel], 'open', 0)).toBe(false)
  })
  it('sans phrase, ou déjà chiffré, rien d’office', () => {
    expect(encryptsByDefault('none', [], 'none', 0)).toBe(false)
    expect(encryptsByDefault('open', [], 'open', 0)).toBe(false)
    expect(encryptsByDefault('masked', [], 'locked', 0)).toBe(false)
  })
})

describe('showsRevenueBanner', () => {
  it('le bandeau tant qu’il n’y a ni phrase ni refus', () => {
    expect(showsRevenueBanner(true, 'none', false)).toBe(true)
  })
  it('plus de bandeau après « Garder en clair »', () => {
    expect(showsRevenueBanner(true, 'none', true)).toBe(false)
  })
  it('rien avec une phrase, même refusée avant, ni avant de savoir', () => {
    expect(showsRevenueBanner(true, 'locked', true)).toBe(false)
    expect(showsRevenueBanner(true, 'open', false)).toBe(false)
    expect(showsRevenueBanner(false, 'none', false)).toBe(false)
  })
})

describe('mergeRevenue', () => {
  it('rien de scellé : la part saisie, l’autre à zéro', () => {
    expect(mergeRevenue(null, 'carte', 412)).toEqual({
      carte: 412,
      especes: 0,
      sures: 0,
      potentielles: 0,
    })
  })
  it('Carte puis Espèces : la Carte déjà scellée est gardée', () => {
    const afterCarte = mergeRevenue(null, 'carte', 412)
    expect(mergeRevenue(afterCarte, 'especes', 50)).toEqual({
      carte: 412,
      especes: 50,
      sures: 0,
      potentielles: 0,
    })
  })
})

describe('clearDatesToSeal', () => {
  const line = (eventId: string, category: string, amount: number, source = 'manual') => ({
    event_id: eventId,
    category,
    amount,
    direction: 'in' as const,
    source,
  })

  it('range les recettes en clair sur Carte et garde les commandes', () => {
    const lines = [
      line('a', 'ventes', 400),
      line('a', 'remboursement', 12),
      line('a', 'commande_sure', 300),
    ]
    expect(clearDatesToSeal(lines, [{ event_id: 'a', potential_orders: 50 }], [])).toEqual([
      { eventId: 'a', revenue: { carte: 412, especes: 0, sures: 300, potentielles: 50 } },
    ])
  })

  it('laisse les dates déjà chiffrées et ne touche pas au cachet de la fiche', () => {
    const lines = [line('a', 'ventes', 400), line('b', 'cachet', 200, 'stepper')]
    expect(clearDatesToSeal(lines, [], ['a'])).toEqual([])
  })

  it('chiffre une date qui n’a que des commandes potentielles', () => {
    expect(clearDatesToSeal([], [{ event_id: 'c', potential_orders: 80 }], [])).toEqual([
      { eventId: 'c', revenue: { carte: 0, especes: 0, sures: 0, potentielles: 80 } },
    ])
  })
})
