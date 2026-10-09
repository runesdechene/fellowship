/**
 * QUOI     — tests de lib/notifications.ts : une phrase et un lien par type, et le groupement par jour.
 * POURQUOI — la cloche n'affiche que ce qu'elle sait dire ; un type inconnu ne casse rien.
 */
import { describe, expect, it } from 'vitest'
import {
  KNOWN_TYPES,
  groupByDay,
  notificationView,
  type NotificationRow,
  type NotificationView,
} from './notifications'

const row = (type: string, data: Record<string, unknown>, created_at = '2026-10-09T10:00:00Z') =>
  ({ id: 'n1', actor_id: 'a1', type, data, read: false, created_at }) satisfies NotificationRow

const event = { event_id: 'e1', event_name: 'Arbor Pagan Fest' }

/** La phrase telle qu'on la lit, ses mots en gras entre ** . */
const said = (view: NotificationView | null) =>
  view?.text.map((part) => (typeof part === 'string' ? part : `**${part.strong}**`)).join('')

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
    expect(said(view)).toBe(
      '**Marion** pose une question sur Arbor Pagan Fest : « L’électricité est fournie ? »',
    )
    expect(view?.href).toBe('/evenement/e1#discussions')
    expect(view?.icon).toBe('question')
  })

  it('une réponse à ta question', () => {
    const view = notificationView(row('thread_reply', { ...event, actor_name: 'Lucas' }))
    expect(said(view)).toBe('**Lucas** a répondu à ta question sur Arbor Pagan Fest')
    expect(view?.href).toBe('/evenement/e1#discussions')
  })

  it('ta réponse choisie', () => {
    const view = notificationView(row('best_reply', event))
    expect(said(view)).toBe('**Arbor Pagan Fest** : ta réponse a été choisie')
  })

  it('une réponse à ton avis, un ami inscrit, une mise à jour, un abonné', () => {
    expect(said(notificationView(row('review_reply', { ...event, actor_name: 'Lina' })))).toBe(
      '**Lina** a répondu à ton avis sur Arbor Pagan Fest',
    )
    expect(said(notificationView(row('friend_going', { ...event, actor_name: 'Gautier' })))).toBe(
      '**Gautier** s’est inscrit à Arbor Pagan Fest, où tu vas aussi.',
    )
    expect(said(notificationView(row('event_updated', event)))).toBe(
      '**Arbor Pagan Fest** a été mis à jour.',
    )
    expect(said(notificationView(row('new_follower', { actor_name: 'Les Bijoux d’Ysée' })))).toBe(
      '**Les Bijoux d’Ysée** suit maintenant ta vitrine.',
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

describe('new_edition', () => {
  const edition = {
    event_id: 'e2',
    event_name: 'Les Aventuriales',
    start_date: '2027-09-24',
    end_date: '2027-09-26',
    previous_event_id: 'e1',
    previous_year: 2026,
  }
  it('annonce le retour du festival et rappelle l’année passée', () => {
    const view = notificationView(row('new_edition', edition))
    expect(view?.eyebrow).toBe('Nouvelle édition')
    expect(said(view)).toBe(
      '**Les Aventuriales** revient du 24 au 26 septembre 2027. Tu y étais en 2026.',
    )
    expect(view?.href).toBe('/evenement/e2')
    expect(view?.action).toEqual({ kind: 'mark', eventId: 'e2' })
    expect(view?.ownerId).toBe('a1')
  })
  it('sans dates, elle n’est pas affichée', () => {
    expect(notificationView(row('new_edition', { ...edition, start_date: undefined }))).toBeNull()
  })
})

describe('KNOWN_TYPES', () => {
  it('liste exactement les types que la cloche sait dire — la requête ne lit qu’eux', () => {
    const full = {
      ...event,
      actor_name: 'X',
      thread_title: 'Q',
      start_date: '2027-09-24',
      end_date: '2027-09-26',
      previous_year: 2026,
      deadline: '2026-10-14',
      days_left: 3,
      city: 'Lyon',
      count: 2,
    }
    for (const type of KNOWN_TYPES) expect(notificationView(row(type, full))).not.toBeNull()
    expect(KNOWN_TYPES).toContain('thread_question')
    expect(KNOWN_TYPES).toEqual(
      expect.arrayContaining(['deadline_reminder', 'friend_added_event', 'weekly_new_events']),
    )
    expect(KNOWN_TYPES).not.toContain('friend_note')
  })
})

describe('les alertes planifiées', () => {
  it('le rappel de clôture', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 7 }),
    )
    expect(said(view)).toBe(
      'Plus que **7 jours** pour candidater à **Arbor Pagan Fest** — clôture le 14 octobre.',
    )
    expect(view?.href).toBe('/evenement/e1')
    expect(view?.icon).toBe('deadline')
  })

  it('le rappel, la veille', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 1 }),
    )
    expect(said(view)).toBe(
      'Plus que **1 jour** pour candidater à **Arbor Pagan Fest** — clôture le 14 octobre.',
    )
  })

  it('le rappel, le dernier jour', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 0 }),
    )
    expect(said(view)).toBe('**Dernier jour** pour candidater à **Arbor Pagan Fest**.')
  })

  it('un rappel sans date limite ne s’affiche pas', () => {
    expect(notificationView(row('deadline_reminder', { ...event, days_left: 3 }))).toBeNull()
  })

  it('un ami a ajouté une date', () => {
    const view = notificationView(
      row('friend_added_event', {
        ...event,
        actor_name: 'Gautier',
        city: 'Lyon',
        start_date: '2027-07-03',
        end_date: '2027-07-05',
      }),
    )
    expect(said(view)).toBe(
      '**Gautier** a ajouté **Arbor Pagan Fest**, à Lyon du 3 au 5 juillet 2027.',
    )
    expect(view?.href).toBe('/evenement/e1')
    expect(view?.icon).toBe('friend')
  })

  it('un ami a ajouté une date sans ville', () => {
    const view = notificationView(
      row('friend_added_event', {
        ...event,
        actor_name: 'Gautier',
        city: null,
        start_date: '2027-07-03',
        end_date: '2027-07-05',
      }),
    )
    expect(said(view)).toBe('**Gautier** a ajouté **Arbor Pagan Fest**, du 3 au 5 juillet 2027.')
  })

  it('le récapitulatif de la semaine', () => {
    const view = notificationView(row('weekly_new_events', { count: 38 }))
    expect(said(view)).toBe('**38 nouveaux événements** sur Fellowship cette semaine.')
    expect(view?.href).toBe('/explorer')
    expect(view?.icon).toBe('explore')
  })

  it('le récapitulatif au singulier', () => {
    const view = notificationView(row('weekly_new_events', { count: 1 }))
    expect(said(view)).toBe('**1 nouvel événement** sur Fellowship cette semaine.')
  })

  it('un récapitulatif sans nombre ne s’affiche pas', () => {
    expect(notificationView(row('weekly_new_events', {}))).toBeNull()
  })
})
