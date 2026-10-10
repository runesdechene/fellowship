/**
 * QUOI     — les six lignes des notifications sur le téléphone : leur nom dans les Réglages, les
 *            notifications que chacune porte, et le message envoyé au téléphone.
 * POURQUOI — lot 8e : la cloche reçoit tout ; chaque ligne décide si elle sonne aussi sur le
 *            téléphone (users.push_muted retient les lignes coupées). Le message est la phrase de
 *            la cloche, sans le gras.
 * ATTENTION — la fonction send-push se sert de ce fichier, recopié par
 *            scripts/sync-push-phrases.mjs : le relancer après chaque changement (un test le
 *            vérifie). Il ne dépend que de notifications.ts et dates.ts.
 */
import { notificationPhrase } from './notifications'

export type PushLine =
  'deadline' | 'new_edition' | 'friends' | 'discussions' | 'new_followers' | 'weekly'

/** Dans l'ordre de la maquette des Réglages. */
export const PUSH_LINES: { key: PushLine; title: string; detail: string; pro: boolean }[] = [
  {
    key: 'deadline',
    title: 'Clôture des candidatures',
    detail: '7 jours avant, pour les festivals repérés',
    pro: true,
  },
  {
    key: 'new_edition',
    title: 'Nouvelle édition d’un festival que tu as fait',
    detail: 'Dès que l’organisateur annonce la date',
    pro: true,
  },
  {
    key: 'friends',
    title: 'Tes amis',
    detail: 'Un ami ajoute une date ou va à un festival',
    pro: false,
  },
  {
    key: 'discussions',
    title: 'Discussions',
    detail: 'Une question sur un festival où tu vas, une réponse à la tienne',
    pro: false,
  },
  {
    key: 'new_followers',
    title: 'Nouveaux abonnés',
    detail: 'Quand quelqu’un suit ta vitrine',
    pro: false,
  },
  {
    key: 'weekly',
    title: 'Le récapitulatif du mardi',
    detail: 'Les nouveaux événements de la semaine sur Fellowship',
    pro: false,
  },
]

const LINE_OF_TYPE: Record<string, PushLine> = {
  deadline_reminder: 'deadline',
  new_edition: 'new_edition',
  friend_added_event: 'friends',
  friend_going: 'friends',
  thread_question: 'discussions',
  thread_reply: 'discussions',
  best_reply: 'discussions',
  review_reply: 'discussions',
  new_follower: 'new_followers',
  weekly_new_events: 'weekly',
}

/** La ligne d'une notification ; null : elle reste dans la cloche. */
export function lineOf(type: string): PushLine | null {
  return LINE_OF_TYPE[type] ?? null
}

export interface PushMessage {
  title: string
  body: string
  /** Un chemin de la V2 (« /evenement/… ») : le service worker le pose sous sa portée. */
  url: string
  /** Deux nouvelles identiques (à la personne et à son enseigne) n'en font qu'une ; deux nouvelles
   *  différentes sur un même festival restent deux (relecture du 10/10/2026). */
  tag: string
}

export function pushMessage(type: string, data: Record<string, unknown>): PushMessage | null {
  if (!lineOf(type)) return null
  const said = notificationPhrase(type, data)
  if (!said) return null
  const body = said.text.map((part) => (typeof part === 'string' ? part : part.strong)).join('')
  return { title: 'Fellowship', body, url: said.href, tag: `${type}:${said.href}` }
}

// Les services de notification des navigateurs : Chrome et Android, Safari, Firefox, Edge. Une
// autre adresse ferait poster la fonction n'importe où (relecture de sécurité du 10/10/2026). La
// même liste garde la table en base (contrainte push_subscriptions_endpoint_host).
const PUSH_SERVICES =
  /^https:\/\/(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)\//

export function isPushEndpoint(url: string): boolean {
  return PUSH_SERVICES.test(url)
}
