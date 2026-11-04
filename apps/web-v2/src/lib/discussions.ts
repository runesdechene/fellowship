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
