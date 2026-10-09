/**
 * QUOI     — tests de lib/notifications.ts : une phrase et un lien par type, et le groupement par jour.
 * POURQUOI — la cloche n'affiche que ce qu'elle sait dire ; un type inconnu ne casse rien.
 */
import { describe, expect, it } from 'vitest'
import { groupByDay, notificationView, type NotificationRow } from './notifications'

const row = (type: string, data: Record<string, unknown>, created_at = '2026-10-09T10:00:00Z') =>
  ({ id: 'n1', type, data, read: false, created_at }) satisfies NotificationRow

const event = { event_id: 'e1', event_name: 'Arbor Pagan Fest' }

describe('notificationView', () => {
  it('une question sur un festival où tu vas', () => {
    const view = notificationView(
      row('thread_question', {
        ...event,
        actor_name: 'Marion',
        actor_avatar_url: 'a.png',
        thread_title: 'L’électricité est fournie ?',
      }),
    )
    expect(view?.lead).toBe('Marion')
    expect(view?.rest).toBe(
      ' pose une question sur Arbor Pagan Fest : « L’électricité est fournie ? »',
    )
    expect(view?.href).toBe('/evenement/e1#discussions')
    expect(view?.icon).toBe('question')
  })

  it('une réponse à ta question', () => {
    const view = notificationView(row('thread_reply', { ...event, actor_name: 'Lucas' }))
    expect(view?.rest).toBe(' a répondu à ta question sur Arbor Pagan Fest')
    expect(view?.href).toBe('/evenement/e1#discussions')
  })

  it('ta réponse choisie', () => {
    const view = notificationView(row('best_reply', event))
    expect(view?.lead).toBe('Arbor Pagan Fest')
    expect(view?.rest).toBe(' : ta réponse a été choisie')
  })

  it('une réponse à ton avis, un ami inscrit, une mise à jour, un abonné', () => {
    expect(notificationView(row('review_reply', { ...event, actor_name: 'Lina' }))?.rest).toBe(
      ' a répondu à ton avis sur Arbor Pagan Fest',
    )
    expect(notificationView(row('friend_going', { ...event, actor_name: 'Gautier' }))?.rest).toBe(
      ' s’est inscrit à Arbor Pagan Fest, où tu vas aussi.',
    )
    expect(notificationView(row('event_updated', event))?.rest).toBe(' a été mis à jour.')
    expect(notificationView(row('new_follower', { actor_name: 'Les Bijoux d’Ysée' }))?.rest).toBe(
      ' suit maintenant ta vitrine.',
    )
  })

  it('un type inconnu, ou un nom manquant, n’est pas affiché', () => {
    expect(notificationView(row('friend_note', event))).toBeNull()
    expect(notificationView(row('thread_reply', { event_id: 'e1' }))).toBeNull()
  })
})

describe('groupByDay', () => {
  const now = new Date(2026, 9, 9, 0, 30) // vendredi 9 octobre, 0 h 30
  const at = (date: Date) => {
    const view = notificationView(row('event_updated', event, date.toISOString()))
    if (!view) throw new Error('vue attendue')
    return view
  }

  it('aujourd’hui, cette semaine, plus tôt — sans groupe vide', () => {
    const groups = groupByDay(
      [at(new Date(2026, 9, 9, 0, 10)), at(new Date(2026, 9, 8, 23, 0)), at(new Date(2026, 8, 29))],
      now,
    )
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ['Aujourd’hui', 1],
      ['Cette semaine', 1],
      ['Plus tôt', 1],
    ])
  })

  it('omet un groupe vide', () => {
    expect(groupByDay([at(new Date(2026, 9, 9, 0, 10))], now).map((group) => group.label)).toEqual([
      'Aujourd’hui',
    ])
  })
})
