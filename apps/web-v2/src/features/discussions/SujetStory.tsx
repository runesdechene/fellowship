/**
 * QUOI     — la story d'un sujet, en plein écran sur son papier : l'auteur, le mot en grand, la
 *            photo ou la vidéo, le festival ; en bas, « Voir les N messages » et le champ pour
 *            répondre (maquette Story, option C).
 * POURQUOI — ouvrir un sujet depuis la barre doit d'abord montrer le sujet, pas un fil vide
 *            (Uriel, 04/11/2026) ; on y répond comme sur Instagram (option C, 05/11/2026).
 * ATTENTION — la discussion complète est un autre état de l'adresse (`?fil`, Conversation) : le
 *            retour du navigateur ramène à la story. Depuis Messages, on arrive droit au tchat.
 */
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDateRange, parseSqlDate, timeAgo } from '@/lib/dates'
import type { ConversationDetail, EventBrief } from '@/lib/discussion-api'
import type { ChatMessage, Person } from '@/lib/discussions'
import { StoryReply } from './StoryReply'

interface Props {
  detail: ConversationDetail
  event: EventBrief | null
  messages: ChatMessage[]
  people: Map<string, Person>
  urls: Map<string, string>
  me: string
  /** « Il y a 2 h, encore 6 jours », ou « clôturé ». */
  remaining: string
  closed: boolean
  onClose: () => void
  /** Ouvre la discussion complète. */
  onOpen: () => void
}

/** « Il y a 2 h », « Hier », « À l'instant ». */
function postedLabel(date: Date, now: Date): string {
  const ago = timeAgo(date, now)
  const label = ago === 'hier' || ago === 'à l’instant' ? ago : `il y a ${ago}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function SujetStory(props: Props) {
  const { detail, event, messages, people, urls, me, remaining, closed, onClose, onOpen } = props
  const author = people.get(detail.createdBy)
  const mine = detail.createdBy === me
  // Le premier message est le mot lui-même, posé à la publication : les réponses viennent après.
  const opening = messages[0]?.authorId === detail.createdBy ? messages[0] : undefined
  const replies = opening ? messages.length - 1 : messages.length
  const media = detail.mediaPath ? urls.get(detail.mediaPath) : undefined
  const placeholder = mine
    ? 'Écrire dans ton sujet…'
    : replies === 0
      ? 'Sois le premier à répondre…'
      : `Répondre à ${author?.label ?? 'ce sujet'}…`

  return (
    <section className="sujet-story" aria-label="Le sujet">
      <header className="sujet-story__head">
        <Avatar className="sujet-story__avatar" src={author?.avatar} name={author?.label} />
        <div className="sujet-story__who">
          <p className="sujet-story__name">{mine ? 'Ton sujet' : author?.label}</p>
          <p className="sujet-story__meta">
            {opening
              ? `${postedLabel(new Date(opening.createdAt), new Date())}, ${remaining}`
              : remaining}
          </p>
        </div>
        <Button variant="icon" aria-label="Fermer" onClick={onClose}>
          <X size={18} strokeWidth={1.75} />
        </Button>
      </header>

      <div className="sujet-story__body">
        <p className="sujet-story__mot">{detail.mot}</p>
        {detail.mediaKind === 'image' && media && (
          <img className="sujet-story__media" src={media} alt="" />
        )}
        {detail.mediaKind === 'video' && media && (
          <video className="sujet-story__media" src={media} controls playsInline />
        )}
        {event && (
          <p className="sujet-story__event">
            {event.name},{' '}
            {formatDateRange(parseSqlDate(event.startDate), parseSqlDate(event.endDate), 'long')}
          </p>
        )}
      </div>

      <div className="sujet-story__foot">
        {replies > 0 && (
          <button type="button" className="sujet-story__more" onClick={onOpen}>
            {replies === 1 ? 'Voir le message' : `Voir les ${String(replies)} messages`}
          </button>
        )}
        {!closed && (
          <StoryReply conversationId={detail.id} placeholder={placeholder} onSent={onOpen} />
        )}
      </div>
    </section>
  )
}
