/**
 * QUOI     — tests de lib/selection.ts : le score d'une fête et la sélection Fellowship.
 * POURQUOI — la sélection est lue par les IA telle quelle : une page vide, une fête passée ou une
 *            raison qui dit « undefined » seraient citées comme des faits.
 */
import { buildSelection, reasonOf, score, type SelectionEvent } from './selection'

const TODAY = new Date(2026, 10, 4) // 4 novembre 2026

function fete(overrides: Partial<SelectionEvent> = {}): SelectionEvent {
  return {
    id: 'id',
    slug: 'slug',
    name: 'Fête',
    city: 'Albi',
    department: '81',
    country: 'FR',
    start_date: '2027-05-01',
    end_date: '2027-05-02',
    registration_deadline: null,
    registration_url: null,
    stand_price: null,
    stand_size: null,
    image_url: null,
    expected_attendance: null,
    edition: null,
    tags: ['fete-medievale'],
    interested: 0,
    registered: 0,
    rating: null,
    rating_count: 0,
    ...overrides,
  }
}

function occitanie(count: number, overrides: Partial<SelectionEvent> = {}): SelectionEvent[] {
  return Array.from({ length: count }, (_, i) =>
    fete({ id: `o${i}`, slug: `o${i}`, name: `Fête ${i}`, ...overrides }),
  )
}

describe('buildSelection', () => {
  it('ne fait pas de page sous trois fêtes à venir', () => {
    expect(buildSelection(occitanie(2), 'fete-medievale', 'Occitanie', TODAY)).toBeNull()
  })

  it('écarte les fêtes passées et celles au-delà de douze mois', () => {
    const events = [
      ...occitanie(3),
      fete({ id: 'passee', start_date: '2026-06-01', end_date: '2026-06-02' }),
      fete({ id: 'lointaine', start_date: '2028-01-10', end_date: '2028-01-11' }),
    ]
    const selection = buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)
    const ids = [...(selection?.top ?? []), ...(selection?.others ?? [])].map((e) => e.id)
    expect(ids).not.toContain('passee')
    expect(ids).not.toContain('lointaine')
    expect(ids).toHaveLength(3)
  })

  it('range une fête sur deux types dans les deux sélections', () => {
    const events = occitanie(3, { tags: ['fete-medievale', 'marche-noel'] })
    expect(buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)).not.toBeNull()
    expect(buildSelection(events, 'marche-noel', 'Occitanie', TODAY)).not.toBeNull()
  })

  it('ne mêle pas les zones', () => {
    const events = [...occitanie(2), fete({ id: 'paca', department: '83' })]
    expect(buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)).toBeNull()
  })

  it('garde cinq fêtes au plus dans le top, par score, puis les autres par date', () => {
    const events = [
      ...occitanie(5, { interested: 10, start_date: '2027-06-01', end_date: '2027-06-01' }),
      fete({ id: 'tard', interested: 0, start_date: '2027-09-01', end_date: '2027-09-01' }),
      fete({ id: 'tot', interested: 0, start_date: '2027-02-01', end_date: '2027-02-01' }),
    ]
    const selection = buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)
    expect(selection?.top).toHaveLength(5)
    expect(selection?.top.every((e) => e.interested === 10)).toBe(true)
    expect(selection?.others.map((e) => e.id)).toEqual(['tot', 'tard'])
  })

  it('départage deux scores égaux par la date, puis le nom', () => {
    const events = [
      fete({ id: 'b', name: 'Beta', start_date: '2027-05-01' }),
      fete({ id: 'a', name: 'Alpha', start_date: '2027-05-01' }),
      fete({ id: 'c', name: 'Avant', start_date: '2027-03-01' }),
    ]
    const selection = buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)
    expect(selection?.top.map((e) => e.id)).toEqual(['c', 'a', 'b'])
  })

  it('titre la page au superlatif, pour l’exposant, avec la saison et la signature', () => {
    const selection = buildSelection(occitanie(3), 'fete-medievale', 'Occitanie', TODAY)
    expect(selection?.season).toBe(2027)
    expect(selection?.title).toBe(
      'Les fêtes médiévales immanquables pour un exposant en Occitanie en 2027 — la sélection Fellowship',
    )
  })

  it('accorde la préposition à la zone', () => {
    const grandEst = occitanie(3, { department: '67' })
    expect(buildSelection(grandEst, 'fete-medievale', 'Grand Est', TODAY)?.title).toContain(
      'pour un exposant dans le Grand Est en 2027',
    )
    const reunion = occitanie(3, { department: '974' })
    expect(buildSelection(reunion, 'fete-medievale', 'La Réunion', TODAY)?.title).toContain(
      'pour un exposant à La Réunion en 2027',
    )
  })

  it('range une fiche suisse dans la zone Suisse', () => {
    const events = occitanie(3, { country: 'CH', department: 'Fribourg' })
    expect(buildSelection(events, 'fete-medievale', 'Suisse', TODAY)?.title).toBe(
      'Les fêtes médiévales immanquables pour un exposant en Suisse en 2027 — la sélection Fellowship',
    )
    expect(buildSelection(events, 'fete-medievale', 'Occitanie', TODAY)).toBeNull()
  })
})

describe('score', () => {
  it('préfère une fiche complète', () => {
    const complete = fete({
      stand_price: '100 €',
      registration_url: 'https://exemple.fr',
      image_url: 'https://exemple.fr/a.webp',
    })
    expect(score(complete)).toBeGreaterThan(score(fete()))
  })

  it('monte avec l’intérêt des exposants', () => {
    expect(score(fete({ interested: 8 }))).toBeGreaterThan(score(fete({ interested: 1 })))
  })

  it('compte un bon avis en bonus, sans punir l’absence d’avis', () => {
    const notee = fete({ rating: 4.5, rating_count: 2 })
    expect(score(notee)).toBeGreaterThan(score(fete()))
    expect(Number.isFinite(score(fete()))).toBe(true)
  })

  it('lit l’affluence attendue dans un texte libre', () => {
    expect(score(fete({ expected_attendance: 'environ 8 000 visiteurs' }))).toBeGreaterThan(
      score(fete()),
    )
  })
})

describe('reasonOf', () => {
  it('dit la raison en faits', () => {
    const event = fete({
      stand_size: '3×3',
      stand_price: '100 €',
      registration_deadline: '2027-03-15',
      interested: 9,
      registered: 3,
    })
    expect(reasonOf(event)).toBe(
      'Stand 3×3 à 100 € · candidatures jusqu’au 15 mars · 12 exposants intéressés',
    )
  })

  it('omet ce qui manque, sans trou', () => {
    expect(reasonOf(fete({ stand_price: '80 €' }))).toBe('Stand à 80 €')
    expect(reasonOf(fete({ interested: 1 }))).toBe('1 exposant intéressé')
    expect(reasonOf(fete())).toBe('')
  })
})
