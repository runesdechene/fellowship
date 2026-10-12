/**
 * QUOI     — le brouillon d'une date : sa relecture, son état vierge, et ce que l'adresse y écrit.
 * POURQUOI — lot 10b : la position vient d'une adresse choisie, jamais d'une adresse retouchée à
 *            la main ; un brouillon d'avant le lot doit se relire sans position.
 */
import {
  addressTyped,
  editBlocker,
  firstBlockedStep,
  isBlank,
  parseDraft,
  placePicked,
  placeTyped,
} from './useEventDraft'

describe('parseDraft', () => {
  it('relit un brouillon écrit avant la position, sans position', () => {
    const draft = parseDraft(JSON.stringify({ name: 'Provins', city: 'Provins' }))
    expect(draft.name).toBe('Provins')
    expect(draft.latitude).toBeNull()
    expect(draft.longitude).toBeNull()
    expect(draft.geoPrecision).toBe('')
  })

  it('rend un brouillon vide sans rien de stocké, ou un stockage illisible', () => {
    expect(isBlank(parseDraft(null))).toBe(true)
    expect(isBlank(parseDraft('{pas du json'))).toBe(true)
  })
})

describe('isBlank', () => {
  it('voit une position seule comme un brouillon commencé', () => {
    expect(isBlank({ ...parseDraft(null), latitude: 45.77 })).toBe(false)
  })
})

describe('l’adresse', () => {
  it('choisie, remplit la ville, le département et la position précise', () => {
    expect(
      placePicked({
        label: 'Place de Jaude 63000 Clermont-Ferrand',
        address: 'Place de Jaude',
        city: 'Clermont-Ferrand',
        department: '63',
        latitude: 45.777,
        longitude: 3.081,
      }),
    ).toEqual({
      address: 'Place de Jaude',
      city: 'Clermont-Ferrand',
      department: '63',
      latitude: 45.777,
      longitude: 3.081,
      geoPrecision: 'precise',
    })
  })

  it('retouchée à la main, ne garde pas la position d’une autre', () => {
    expect(addressTyped('Place de Jaude, côté opéra')).toEqual({
      address: 'Place de Jaude, côté opéra',
      latitude: null,
      longitude: null,
      geoPrecision: '',
    })
  })
})

describe('placeTyped', () => {
  it('une ville ou un département retouché ne garde pas la position d’un autre lieu', () => {
    expect(placeTyped('city', 'Riom')).toEqual({
      city: 'Riom',
      latitude: null,
      longitude: null,
      geoPrecision: '',
    })
    expect(placeTyped('department', '03')).toEqual({
      department: '03',
      latitude: null,
      longitude: null,
      geoPrecision: '',
    })
  })
})

describe('firstBlockedStep', () => {
  const ready = {
    ...parseDraft(null),
    name: 'Les Médiévales',
    city: 'Provins',
    department: '77',
    startDate: '2026-12-12',
    tags: ['Médiéval'],
  }

  it('rien ne bloque un brouillon complet', () => {
    expect(firstBlockedStep(ready)).toBeNull()
  })

  it('une ville vidée depuis la barre bloque à l’étape 2, même vue depuis la dernière', () => {
    expect(firstBlockedStep({ ...ready, city: '' })).toBe(1)
  })

  it('la première étape bloquée l’emporte', () => {
    expect(firstBlockedStep({ ...ready, name: 'P', tags: [] })).toBe(0)
  })
})

describe('editBlocker', () => {
  const ready = {
    ...parseDraft(null),
    name: 'Les Médiévales',
    city: 'Provins',
    department: '77',
    startDate: '2026-12-12',
    tags: ['Médiéval'],
  }

  it('dit exactement ce qui bloque l’enregistrement d’une fiche', () => {
    expect(editBlocker(ready)).toBeNull()
    expect(editBlocker({ ...ready, tags: [] })).toBe('Choisis au moins une catégorie.')
    expect(editBlocker({ ...ready, endDate: '2026-12-01' })).toBe(
      'La date de fin tombe avant le début.',
    )
    expect(editBlocker({ ...ready, city: ' ' })).toBe('La ville est nécessaire.')
  })
})
