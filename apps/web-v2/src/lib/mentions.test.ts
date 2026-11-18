/**
 * QUOI     — tests de lib/mentions.ts : repérer, insérer, garder et découper les @ d'un sujet.
 * POURQUOI — un @ mal découpé taguerait la mauvaise personne ou en perdrait une.
 */
import { describe, expect, it } from 'vitest'
import { insertMention, keptMentions, mentionQuery, splitMentions, toMentions } from './mentions'

const lia = { id: 'l', name: 'Lia Céramique', slug: 'lia' }
const liaCourt = { id: 'c', name: 'Lia', slug: 'lia-court' }

describe('mentionQuery', () => {
  it('lit le nom tapé après @', () => {
    expect(mentionQuery('Salut @Bra', 10)).toEqual({ start: 6, query: 'Bra' })
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' })
  })
  it('garde les espaces d’un nom composé', () => {
    expect(mentionQuery('@Brasserie du', 13)).toEqual({ start: 0, query: 'Brasserie du' })
  })
  it('ne s’ouvre pas dans une adresse e-mail ni après un retour à la ligne', () => {
    expect(mentionQuery('moi@flw.sh', 10)).toBeNull()
    expect(mentionQuery('@Bra\nsuite', 10)).toBeNull()
    expect(mentionQuery('sans arobase', 5)).toBeNull()
  })
})

describe('insertMention', () => {
  it('remplace le nom en cours et place le curseur après', () => {
    expect(insertMention('Salut @Bra et toi', 6, 10, 'Brasserie du Gué')).toEqual({
      text: 'Salut @Brasserie du Gué  et toi',
      caret: 24,
    })
  })
})

describe('keptMentions', () => {
  it('oublie un tag effacé du texte, et les doublons', () => {
    expect(keptMentions('Coucou @Lia Céramique', [lia, lia, liaCourt])).toEqual([lia, liaCourt])
    expect(keptMentions('Coucou', [lia])).toEqual([])
  })
})

describe('splitMentions', () => {
  it('découpe le texte autour des tags, le nom le plus long d’abord', () => {
    expect(splitMentions('Go @Lia Céramique !', [liaCourt, lia])).toEqual(['Go ', lia, ' !'])
  })
  it('laisse un @ inconnu en texte', () => {
    expect(splitMentions('@Inconnu salut', [lia])).toEqual(['@Inconnu salut'])
  })
})

describe('toMentions', () => {
  it('ne garde que les mentions bien formées', () => {
    expect(toMentions([lia, { id: 1 }, null])).toEqual([lia])
    expect(toMentions('nope')).toEqual([])
  })
})
