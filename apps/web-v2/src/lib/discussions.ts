/**
 * QUOI     — la logique des sujets et du tchat : publics, délai restant, couleur d'une
 *            conversation, regroupement des bulles, nom d'une conversation.
 * POURQUOI — logique pure, sans React ni réseau : elle se teste et se relit seule
 *            (docs/superpowers/specs/2026-11-04-sujets-et-messages-design.md).
 */
import { tagStyleFor, type TagStyle } from './tags'

/** Le mot d'un sujet : court, comme une note. La base impose la même borne. */
export const MOT_MAX = 80

export type Audience = 'amis' | 'abonnes' | 'public'

export const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'amis', label: 'Amis' },
  { value: 'abonnes', label: 'Abonnés' },
  { value: 'public', label: 'Public' },
]

/** La phrase sous le choix : à qui part le sujet, et combien de temps. */
export function audienceHint(audience: Audience): string {
  if (audience === 'amis')
    return 'Tes amis le voient en haut de Fellowship pendant 7 jours, ou jusqu’à ce que tu le clôtures : les exposants que tu suis et qui te suivent.'
  if (audience === 'abonnes')
    return 'Ceux qui te suivent le voient en haut de Fellowship pendant 7 jours, ou jusqu’à ce que tu le clôtures.'
  return 'Tout Fellowship le voit pendant 7 jours, ou jusqu’à ce que tu le clôtures.'
}

const DAY = 86_400_000

/** « encore 6 jours », « encore 1 jour », « dernières heures », « clôturé ». */
export function remainingLabel(expiresAt: Date, closedAt: Date | null, now: Date): string {
  if (closedAt || expiresAt <= now) return 'clôturé'
  const days = Math.floor((expiresAt.getTime() - now.getTime()) / DAY)
  if (days === 0) return 'dernières heures'
  return days === 1 ? 'encore 1 jour' : `encore ${String(days)} jours`
}

/**
 * La couleur d'une conversation : celle de la première catégorie du festival lié (l'anneau prend
 * le fond du tag, les bulles son encre), sinon aucune — le CSS pose alors le brun chaud.
 */
export function conversationTone(
  styles: Map<string, TagStyle>,
  tags: string[] | null,
): TagStyle | null {
  for (const tag of tags ?? []) {
    const style = tagStyleFor(styles, tag)
    if (style) return style
  }
  return null
}

export interface ChatMessage {
  id: string
  authorId: string
  body: string | null
  mediaPath: string | null
  mediaKind: 'image' | 'video' | null
  createdAt: string
}

/** Une bulle, avec ce que son voisinage décide : le nom au début d'une suite, l'avatar à la fin. */
export interface Bubble extends ChatMessage {
  mine: boolean
  /** Premier message d'une suite du même auteur : on écrit son nom (chez les autres). */
  first: boolean
  /** Dernier d'une suite : la bulle porte sa pointe, et l'avatar s'affiche. */
  last: boolean
  /** Le jour change avant cette bulle : un séparateur s'intercale. */
  newDay: boolean
}

const SAME_RUN = 5 * 60_000

function dayOf(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`
}

/** Les messages, du plus ancien au plus récent, regroupés en suites comme sur WhatsApp. */
export function toBubbles(messages: ChatMessage[], me: string): Bubble[] {
  return messages.map((message, index) => {
    const before = messages[index - 1]
    const after = messages[index + 1]
    const joins = (a: ChatMessage | undefined, b: ChatMessage | undefined) =>
      !!a &&
      !!b &&
      a.authorId === b.authorId &&
      dayOf(a.createdAt) === dayOf(b.createdAt) &&
      Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < SAME_RUN
    return {
      ...message,
      mine: message.authorId === me,
      first: !joins(before, message),
      last: !joins(message, after),
      newDay: !before || dayOf(before.createdAt) !== dayOf(message.createdAt),
    }
  })
}

export interface Person {
  id: string
  label: string
  avatar: string | null
}

/** Le nom d'une conversation dans la boîte : le sujet, le nom du groupe, ou les gens dedans. */
export function conversationName(
  kind: 'sujet' | 'direct' | 'groupe',
  mot: string | null,
  title: string | null,
  others: Person[],
): string {
  if (kind === 'sujet') return mot ?? 'Sujet'
  if (title) return title
  if (others.length === 0) return 'Toi seul'
  return others.map((other) => other.label).join(', ')
}

/** Ce que montre la boîte sous le nom : « Lia : Je suis à Riom… », « Toi : Photo ». */
export function previewLine(
  body: string | null,
  media: 'image' | 'video' | null,
  authorLabel: string | null,
  mine: boolean,
  kind: 'sujet' | 'direct' | 'groupe',
): string {
  const text = body ?? (media === 'video' ? 'Vidéo' : media === 'image' ? 'Photo' : '')
  if (mine) return `Toi : ${text}`
  // À deux, l'auteur est évident ; dans un groupe ou un sujet, on le nomme.
  if (kind === 'direct' || !authorLabel) return text
  return `${authorLabel} : ${text}`
}

/** Les réactions d'un appui long ; « + » ouvre le clavier du téléphone pour un autre emoji. */
export const REACTIONS = ['❤️', '😂', '😮', '👍', '🙏', '🔥']

/** Une réaction par personne et par message ; `emoji` nul : elle a été retirée. */
export interface Reaction {
  messageId: string
  actorId: string
  emoji: string | null
}

/** La pastille d'une bulle : les emojis donnés (le plus donné d'abord), leur total, le sien. */
export interface ReactionSummary {
  emojis: string[]
  total: number
  mine: string | null
}

export function summarizeReactions(
  reactions: Reaction[],
  me: string,
): Map<string, ReactionSummary> {
  const counts = new Map<string, Map<string, number>>()
  const mine = new Map<string, string>()
  for (const { messageId, actorId, emoji } of reactions) {
    if (!emoji) continue
    const forMessage = counts.get(messageId) ?? new Map<string, number>()
    forMessage.set(emoji, (forMessage.get(emoji) ?? 0) + 1)
    counts.set(messageId, forMessage)
    if (actorId === me) mine.set(messageId, emoji)
  }
  const summaries = new Map<string, ReactionSummary>()
  for (const [messageId, forMessage] of counts) {
    const ranked = [...forMessage].sort((a, b) => b[1] - a[1])
    summaries.set(messageId, {
      emojis: ranked.map(([emoji]) => emoji),
      total: ranked.reduce((sum, [, count]) => sum + count, 0),
      mine: mine.get(messageId) ?? null,
    })
  }
  return summaries
}

/** La liste après une réaction : celle de cette personne sur ce message est remplacée. */
export function withReaction(reactions: Reaction[], next: Reaction): Reaction[] {
  const others = reactions.filter(
    (reaction) => reaction.messageId !== next.messageId || reaction.actorId !== next.actorId,
  )
  return [...others, next]
}

/** Un drapeau est fait de deux lettres régionales, pas d'un pictogramme. */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

/** Le premier emoji tapé au clavier (un drapeau ou une famille compte pour un seul). */
export function firstEmoji(text: string): string | null {
  const segments = new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text.trim())
  for (const { segment } of segments) return EMOJI.test(segment) ? segment : null
  return null
}

/** Messages se quitte vers la page d'où l'on est venu, portée par l'adresse (`state.from`). */
export function messagesExit(state: unknown): string {
  return typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
    ? state.from
    : '/'
}
