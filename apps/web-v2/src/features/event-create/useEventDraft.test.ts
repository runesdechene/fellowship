/**
 * QUOI     — le brouillon d'une date : sa relecture, son état vierge, et ce que l'adresse y écrit.
 * POURQUOI — lot 10b : la position vient d'une adresse choisie, jamais d'une adresse retouchée à
 *            la main ; un brouillon d'avant le lot doit se relire sans position.
 */
import { addressTyped, isBlank, parseDraft, placePicked } from './useEventDraft'

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
