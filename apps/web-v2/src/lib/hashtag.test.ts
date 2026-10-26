/**
 * QUOI     — tests de la balise en cours de frappe et de son insertion.
 * POURQUOI — la frappe d'un # dans une note propose les balises existantes ; une ancre d'adresse
 *            (site.com/#a) ne doit rien proposer.
 */
import { describe, expect, it } from 'vitest'
import { hashtagAt, insertHashtag, suggestHashtags } from './hashtag'

describe('hashtagAt', () => {
  it('trouve la balise en début de note et après une espace', () => {
    expect(hashtagAt('#Or', 3)).toEqual({ start: 0, prefix: 'Or' })
    expect(hashtagAt('vu au salon #Fe', 15)).toEqual({ start: 12, prefix: 'Fe' })
  })

  it('propose dès le # seul', () => {
    expect(hashtagAt('note #', 6)).toEqual({ start: 5, prefix: '' })
  })

  it('prend les accents', () => {
    expect(hashtagAt('#Été', 4)).toEqual({ start: 0, prefix: 'Été' })
  })

  it('ignore une ancre d’adresse et une balise déjà finie', () => {
    expect(hashtagAt('site.com/#a', 11)).toBeNull()
    expect(hashtagAt('#Orga ', 6)).toBeNull()
  })

  it('lit seulement ce qui précède le curseur', () => {
    expect(hashtagAt('#Orga et suite', 3)).toEqual({ start: 0, prefix: 'Or' })
  })
})

describe('suggestHashtags', () => {
  const tags = ['FestivalYggdrasil', 'Orga', 'Uriel']

  it('complète sans la casse, sans reproposer la balise déjà entière', () => {
    expect(suggestHashtags(tags, 'or')).toEqual(['Orga'])
    expect(suggestHashtags(tags, 'orga')).toEqual([])
    expect(suggestHashtags(tags, '')).toEqual(tags)
  })
})

describe('insertHashtag', () => {
  it('remplace la frappe par la balise et pose le curseur après son espace', () => {
    expect(insertHashtag('vu #Or', { start: 3, prefix: 'Or' }, 6, 'Orga')).toEqual({
      text: 'vu #Orga ',
      caret: 9,
    })
  })

  it('garde la suite de la note sans doubler l’espace', () => {
    expect(insertHashtag('#Or et suite', { start: 0, prefix: 'Or' }, 3, 'Orga')).toEqual({
      text: '#Orga et suite',
      caret: 6,
    })
  })
})
