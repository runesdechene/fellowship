/**
 * QUOI     — les tests de la logique des sujets et du tchat.
 * POURQUOI — le délai d'un sujet et le regroupement des bulles se trompent en silence : un sujet
 *            « encore 0 jour », une pointe sur la mauvaise bulle.
 */
import { describe, expect, it } from 'vitest'
import {
  conversationName,
  conversationTone,
  firstEmoji,
  messagesExit,
  previewLine,
  remainingLabel,
  summarizeReactions,
  toBubbles,
  withReaction,
  type ChatMessage,
} from './discussions'

const now = new Date('2026-11-04T12:00:00')

describe('remainingLabel', () => {
  it('compte les jours pleins restants', () => {
    expect(remainingLabel(new Date('2026-11-11T11:00:00'), null, now)).toBe('encore 6 jours')
    expect(remainingLabel(new Date('2026-11-05T13:00:00'), null, now)).toBe('encore 1 jour')
  })
  it('annonce les dernières heures, puis la fin', () => {
    expect(remainingLabel(new Date('2026-11-04T20:00:00'), null, now)).toBe('dernières heures')
    expect(remainingLabel(new Date('2026-11-04T11:00:00'), null, now)).toBe('clôturé')
    expect(remainingLabel(new Date('2026-11-09T11:00:00'), now, now)).toBe('clôturé')
  })
})

describe('conversationTone', () => {
  const styles = new Map([
    ['fantastique', { label: 'Fantastique', bgColor: '#c4a0e0', textColor: '#7a638b' }],
  ])
  it('prend la première catégorie connue du festival', () => {
    expect(conversationTone(styles, ['inconnue', 'fantastique'])?.textColor).toBe('#7a638b')
  })
  it('ne colore rien sans festival', () => {
    expect(conversationTone(styles, null)).toBeNull()
  })
})

describe('toBubbles', () => {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()
  const message = (id: string, authorId: string, minutes: number): ChatMessage => ({
    id,
    authorId,
    body: id,
    mediaPath: null,
    mediaKind: null,
    createdAt: at(minutes),
    editedAt: null,
  })

  it('regroupe les messages proches d’un même auteur', () => {
    const bubbles = toBubbles(
      [
        message('a', 'lia', 0),
        message('b', 'lia', 1),
        message('c', 'moi', 2),
        message('d', 'lia', 30),
      ],
      'moi',
    )
    expect(bubbles.map((b) => [b.first, b.last])).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, true],
    ])
    expect(bubbles[2]?.mine).toBe(true)
  })

  it('pose un séparateur au premier message et à chaque nouveau jour', () => {
    const bubbles = toBubbles([message('a', 'lia', 0), message('b', 'lia', 24 * 60)], 'moi')
    expect(bubbles.map((b) => b.newDay)).toEqual([true, true])
  })
})

describe('conversationName et previewLine', () => {
  const lia = { id: 'l', label: 'Lia Céramique', avatar: null }
  it('nomme un sujet par son mot, un groupe par son nom, sinon par ses membres', () => {
    expect(conversationName('sujet', 'Covoit’ ?', null, [lia])).toBe('Covoit’ ?')
    expect(conversationName('groupe', null, 'Les Limougeauds', [lia])).toBe('Les Limougeauds')
    expect(conversationName('direct', null, null, [lia])).toBe('Lia Céramique')
  })
  it('nomme l’auteur dans un groupe, pas à deux', () => {
    expect(previewLine('Salut', null, 'Lia', false, 'groupe')).toBe('Lia : Salut')
    expect(previewLine('Salut', null, 'Lia', false, 'direct')).toBe('Salut')
    expect(previewLine(null, 'image', null, true, 'direct')).toBe('Toi : Photo')
  })
})

describe('summarizeReactions', () => {
  it('compte par message, le plus donné d’abord, et retient le sien', () => {
    const summary = summarizeReactions(
      [
        { messageId: 'm1', actorId: 'a', emoji: '👍' },
        { messageId: 'm1', actorId: 'b', emoji: '😂' },
        { messageId: 'm1', actorId: 'moi', emoji: '😂' },
        { messageId: 'm2', actorId: 'a', emoji: null },
      ],
      'moi',
    )
    expect(summary.get('m1')).toEqual({ emojis: ['😂', '👍'], total: 3, mine: '😂' })
    expect(summary.has('m2')).toBe(false)
  })
})

describe('withReaction', () => {
  it('remplace la réaction de la même personne sur le même message', () => {
    const list = [
      { messageId: 'm1', actorId: 'a', emoji: '👍' },
      { messageId: 'm1', actorId: 'b', emoji: '👍' },
    ]
    expect(withReaction(list, { messageId: 'm1', actorId: 'a', emoji: null })).toEqual([
      { messageId: 'm1', actorId: 'b', emoji: '👍' },
      { messageId: 'm1', actorId: 'a', emoji: null },
    ])
  })
})

describe('firstEmoji', () => {
  it('garde le premier emoji, entier', () => {
    expect(firstEmoji('🇫🇷 bravo')).toBe('🇫🇷')
    expect(firstEmoji('👨‍👩‍👧')).toBe('👨‍👩‍👧')
    expect(firstEmoji('salut')).toBeNull()
  })
})

describe('messagesExit', () => {
  it('revient à la page d’origine, sinon au tableau de bord', () => {
    expect(messagesExit({ from: '/calendrier?mois=2026-11' })).toBe('/calendrier?mois=2026-11')
    expect(messagesExit(null)).toBe('/')
    expect(messagesExit({ from: 3 })).toBe('/')
  })
})
