/**
 * QUOI     — les notifications en phrases : ce que dit chacune, où elle mène, et leur groupement
 *            par jour (Aujourd'hui, Cette semaine, Plus tôt).
 * POURQUOI — la base écrit les notifications (déclencheurs) avec leurs données brutes ; la cloche
 *            les rend lisibles. Logique pure, testée seule.
 * ATTENTION — un type que la V2 ne sait pas dire (ou une donnée manquante) rend null : il n'est
 *            pas affiché, comme dans la V1.
 */

export interface NotificationRow {
  id: string
  type: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export type NotificationIcon = 'question' | 'reply' | 'star' | 'friend' | 'follow' | 'update'

export interface NotificationView {
  id: string
  read: boolean
  at: Date
  avatarUrl: string | null
  icon: NotificationIcon
  /** Le début, en gras : un nom ou un festival. */
  lead: string
  rest: string
  href: string
}

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === 'string' && value !== '' ? value : null
}

type Phrase = Pick<NotificationView, 'icon' | 'lead' | 'rest' | 'href'>

function phrase(type: string, data: Record<string, unknown>): Phrase | null {
  const who = text(data, 'actor_name')
  const event = text(data, 'event_name')
  const eventId = text(data, 'event_id')
  const fiche = eventId ? `/evenement/${eventId}` : null
  const discussion = fiche ? `${fiche}#discussions` : null

  switch (type) {
    case 'thread_question': {
      const title = text(data, 'thread_title')
      if (!who || !event || !discussion) return null
      const quoted = title ? ` : « ${title} »` : ''
      return {
        icon: 'question',
        lead: who,
        rest: ` pose une question sur ${event}${quoted}`,
        href: discussion,
      }
    }
    case 'thread_reply':
      if (!who || !event || !discussion) return null
      return {
        icon: 'reply',
        lead: who,
        rest: ` a répondu à ta question sur ${event}`,
        href: discussion,
      }
    case 'best_reply':
      if (!event || !discussion) return null
      return { icon: 'star', lead: event, rest: ' : ta réponse a été choisie', href: discussion }
    case 'review_reply':
      if (!who || !event || !fiche) return null
      return { icon: 'reply', lead: who, rest: ` a répondu à ton avis sur ${event}`, href: fiche }
    case 'friend_going':
      if (!who || !event || !fiche) return null
      return {
        icon: 'friend',
        lead: who,
        rest: ` s’est inscrit à ${event}, où tu vas aussi.`,
        href: fiche,
      }
    case 'event_updated':
      if (!event || !fiche) return null
      return { icon: 'update', lead: event, rest: ' a été mis à jour.', href: fiche }
    case 'new_follower':
      if (!who) return null
      return { icon: 'follow', lead: who, rest: ' suit maintenant ta vitrine.', href: '/' }
    default:
      return null
  }
}

export function notificationView(row: NotificationRow): NotificationView | null {
  const said = phrase(row.type, row.data)
  if (!said) return null
  return {
    id: row.id,
    read: row.read,
    at: new Date(row.created_at),
    avatarUrl: text(row.data, 'actor_avatar_url'),
    ...said,
  }
}

type DayLabel = 'Aujourd’hui' | 'Cette semaine' | 'Plus tôt'

export function groupByDay(
  views: NotificationView[],
  now: Date,
): { label: DayLabel; items: NotificationView[] }[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  const groups: { label: DayLabel; items: NotificationView[] }[] = [
    { label: 'Aujourd’hui', items: [] },
    { label: 'Cette semaine', items: [] },
    { label: 'Plus tôt', items: [] },
  ]
  for (const view of views) {
    const index = view.at >= today ? 0 : view.at >= weekStart ? 1 : 2
    groups[index]?.items.push(view)
  }
  return groups.filter((group) => group.items.length > 0)
}
