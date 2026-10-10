/**
 * QUOI     — les notifications en phrases : ce que dit chacune, où elle mène, et leur groupement
 *            par jour (Aujourd'hui, Cette semaine, Plus tôt).
 * POURQUOI — la base écrit les notifications (déclencheurs) avec leurs données brutes ; la cloche
 *            les rend lisibles. Logique pure, testée seule.
 * ATTENTION — les dates passent par lib/dates.ts. Un type que la V2 ne sait pas dire (ou une donnée manquante) rend null : il n'est
 *            pas affiché, comme dans la V1.
 */

import { formatDateSpan, formatDayMonth, parseSqlDate } from './dates'

/** Les types que la cloche sait dire. La lecture ne demande QU'EUX : une limite de 50 lignes
 *  remplie de types illisibles viderait la cloche (piège vu en relecture, 09/10/2026). */
export const KNOWN_TYPES = [
  'new_edition',
  'thread_question',
  'thread_reply',
  'best_reply',
  'review_reply',
  'friend_going',
  'event_updated',
  'new_follower',
  'deadline_reminder',
  'friend_added_event',
  'weekly_new_events',
] as const

export interface NotificationRow {
  id: string
  /** Le destinataire : l'enseigne ou la personne pour qui la notification a été écrite. */
  actor_id: string
  type: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export type NotificationIcon =
  | 'question'
  | 'reply'
  | 'star'
  | 'friend'
  | 'follow'
  | 'update'
  | 'edition'
  | 'deadline'
  | 'explore'

/** Un morceau de phrase : du texte simple, ou des mots en gras. */
export type TextPart = string | { strong: string }

export interface NotificationView {
  id: string
  /** Pour qui elle a été écrite : un geste (« Repérer ») agit pour cet acteur-là. */
  ownerId: string
  read: boolean
  at: Date
  /** Le surtitre (« Nouvelle édition »). */
  eyebrow?: string
  /** Un geste dans la cloche, sans ouvrir la fiche. */
  action?: { kind: 'mark'; eventId: string }
  icon: NotificationIcon
  /** La phrase, ses mots en gras à part : un nom, un festival, « 7 jours ». */
  text: TextPart[]
  href: string
}

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === 'string' && value !== '' ? value : null
}

export type Phrase = Pick<NotificationView, 'icon' | 'text' | 'href' | 'eyebrow' | 'action'>

/** Ce que dit une notification et où elle mène. La cloche l'affiche ; le téléphone la reçoit
 *  (lib/push-lines.ts). */
export function notificationPhrase(type: string, data: Record<string, unknown>): Phrase | null {
  const who = text(data, 'actor_name')
  const event = text(data, 'event_name')
  const eventId = text(data, 'event_id')
  const fiche = eventId ? `/evenement/${eventId}` : null
  const discussion = fiche ? `${fiche}#discussions` : null

  switch (type) {
    case 'new_edition': {
      const start = text(data, 'start_date')
      const end = text(data, 'end_date')
      const year = data.previous_year
      if (!event || !eventId || !fiche || !start || !end) return null
      const dates = formatDateSpan(parseSqlDate(start), parseSqlDate(end))
      const startYear = start.slice(0, 4)
      const before = typeof year === 'number' ? ` Tu y étais en ${String(year)}.` : ''
      return {
        icon: 'edition',
        eyebrow: 'Nouvelle édition',
        text: [{ strong: event }, ` revient ${dates} ${startYear}.${before}`],
        href: fiche,
        action: { kind: 'mark', eventId },
      }
    }
    case 'thread_question': {
      const title = text(data, 'thread_title')
      if (!who || !event || !discussion) return null
      const quoted = title ? ` : « ${title} »` : ''
      return {
        icon: 'question',
        text: [{ strong: who }, ` pose une question sur ${event}${quoted}`],
        href: discussion,
      }
    }
    case 'thread_reply':
      if (!who || !event || !discussion) return null
      return {
        icon: 'reply',
        text: [{ strong: who }, ` a répondu à ta question sur ${event}`],
        href: discussion,
      }
    case 'best_reply':
      if (!event || !discussion) return null
      return {
        icon: 'star',
        text: [{ strong: event }, ' : ta réponse a été choisie'],
        href: discussion,
      }
    case 'review_reply':
      if (!who || !event || !fiche) return null
      return {
        icon: 'reply',
        text: [{ strong: who }, ` a répondu à ton avis sur ${event}`],
        href: fiche,
      }
    case 'friend_going':
      if (!who || !event || !fiche) return null
      return {
        icon: 'friend',
        text: [{ strong: who }, ` s’est inscrit à ${event}, où tu vas aussi.`],
        href: fiche,
      }
    case 'event_updated':
      if (!event || !fiche) return null
      return { icon: 'update', text: [{ strong: event }, ' a été mis à jour.'], href: fiche }
    case 'new_follower':
      if (!who) return null
      return { icon: 'follow', text: [{ strong: who }, ' suit maintenant ta vitrine.'], href: '/' }
    case 'deadline_reminder': {
      const deadline = text(data, 'deadline')
      const days = data.days_left
      if (!event || !fiche || !deadline || typeof days !== 'number') return null
      if (days <= 0) {
        return {
          icon: 'deadline',
          text: [{ strong: 'Dernier jour' }, ' pour candidater à ', { strong: event }, '.'],
          href: fiche,
        }
      }
      const left = `${String(days)} ${days === 1 ? 'jour' : 'jours'}`
      const close = formatDayMonth(parseSqlDate(deadline))
      return {
        icon: 'deadline',
        text: [
          'Plus que ',
          { strong: left },
          ' pour candidater à ',
          { strong: event },
          ` — clôture le ${close}.`,
        ],
        href: fiche,
      }
    }
    case 'friend_added_event': {
      const start = text(data, 'start_date')
      const end = text(data, 'end_date')
      const city = text(data, 'city')
      if (!who || !event || !fiche || !start || !end) return null
      const dates = `${formatDateSpan(parseSqlDate(start), parseSqlDate(end))} ${start.slice(0, 4)}`
      const where = city ? `, à ${city} ${dates}.` : `, ${dates}.`
      return {
        icon: 'friend',
        text: [{ strong: who }, ' a ajouté ', { strong: event }, where],
        href: fiche,
      }
    }
    case 'weekly_new_events': {
      const count = data.count
      if (typeof count !== 'number' || count < 1) return null
      const added = count === 1 ? '1 nouvel événement' : `${String(count)} nouveaux événements`
      return {
        icon: 'explore',
        text: [{ strong: added }, ' sur Fellowship cette semaine.'],
        href: '/explorer',
      }
    }
    default:
      return null
  }
}

export function notificationView(row: NotificationRow): NotificationView | null {
  const said = notificationPhrase(row.type, row.data)
  if (!said) return null
  return {
    id: row.id,
    ownerId: row.actor_id,
    read: row.read,
    at: new Date(row.created_at),
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
