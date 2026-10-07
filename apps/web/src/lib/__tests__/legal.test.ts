import { describe, it, expect } from 'vitest'
import { getOtherLegalDocs, LEGAL_DOCS } from '../legal'

describe('getOtherLegalDocs', () => {
  it('renvoie les 4 autres docs en excluant celui passé en paramètre', () => {
    const others = getOtherLegalDocs('cgu')
    expect(others).toHaveLength(4)
    expect(others.find(d => d.slug === 'cgu')).toBeUndefined()
  })

  it('renvoie les 5 docs si le slug ne correspond à rien', () => {
    const all = getOtherLegalDocs('inconnu')
    expect(all).toHaveLength(5)
  })

  it('préserve l\'ordre déclaré dans LEGAL_DOCS', () => {
    const others = getOtherLegalDocs('mentions-legales')
    expect(others.map(d => d.slug)).toEqual([
      'confidentialite',
      'cgu',
      'cgv',
      'charte-communautaire',
    ])
  })

  it('LEGAL_DOCS contient les 5 documents attendus', () => {
    const slugs = LEGAL_DOCS.map(d => d.slug)
    expect(slugs).toEqual([
      'mentions-legales',
      'confidentialite',
      'cgu',
      'cgv',
      'charte-communautaire',
    ])
  })
})
