/**
 * QUOI     — la story d'un sujet, en plein écran sur son papier : l'auteur, le mot en grand, la
 *            photo ou la vidéo, le festival ; en bas dépasse la discussion, qu'on glisse vers le
 *            haut (maquette Story, « Un sujet ouvert, la story »).
 * POURQUOI — ouvrir un sujet depuis la barre doit d'abord montrer le sujet, pas un fil vide
 *            (Uriel, 04/11/2026) ; sans réponse, on invite à être le premier.
 * ATTENTION — le glissement est le défilement du tiroir, aimanté sur la story puis sur le tchat
 *            (scroll-snap) : aucun geste à coder. Depuis Messages, on arrive droit au tchat.
 */
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDateRange, parseSqlDate, timeAgo } from '@/lib/dates'
import type { ConversationDetail, EventBrief } from '@/lib/discussion-api'
import { previewLine, remainingLabel, type ChatMessage, type Person } from '@/lib/discussions'

interface Props {
  detail: ConversationDetail
  event: EventBrief | null
  messages: ChatMessage[]
  people: Map<string, Person>
  urls: Map<string, string>
  me: string
  onClose: () => void
  /** Descend au tchat ; `reply` y met le curseur dans la saisie. */
  onOpen: (reply: boolean) => void
}

/** « Il y a 2 h », « Hier », « À l'instant ». */
function postedLabel(date: Date, now: Date): string {
  const ago = timeAgo(date, now)
  const label = ago === 'hier' || ago === 'à l’instant' ? ago : `il y a ${ago}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function SujetStory({ detail, event, messages, people, urls, me, onClose, onOpen }: Props) {
  const now = new Date()
  const author = people.get(detail.createdBy)
  const mine = detail.createdBy === me
  // Le premier message est le mot lui-même, posé à la publication : les réponses viennent après.
  const opening = messages[0]?.authorId === detail.createdBy ? messages[0] : undefined
  const replies = opening ? messages.slice(1) : messages
  const last = replies.at(-1)
  const lastAuthor = last ? people.get(last.authorId) : undefined
  const voices = new Set(messages.map((message) => message.authorId)).size
  const media = detail.mediaPath ? urls.get(detail.mediaPath) : undefined
  const remaining = remainingLabel(
    new Date(detail.expiresAt ?? 0),
    detail.closedAt ? new Date(detail.closedAt) : null,
    now,
  )

  return (
    <section className="sujet-story" aria-label="Le sujet">
      <header className="sujet-story__head">
        <Avatar className="sujet-story__avatar" src={author?.avatar} name={author?.label} />
        <div className="sujet-story__who">
          <p className="sujet-story__name">{mine ? 'Ton sujet' : author?.label}</p>
          <p className="sujet-story__meta">
            {opening ? `${postedLabel(new Date(opening.createdAt), now)}, ${remaining}` : remaining}
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

      <div className="sujet-story__peek">
        <span className="sujet-story__grip" aria-hidden="true" />
        {last ? (
          <div className="sujet-story__last">
            <Avatar
              className="sujet-story__last-avatar"
              src={lastAuthor?.avatar}
              name={lastAuthor?.label}
            />
            <div className="sujet-story__last-text">
              <p className="sujet-story__count">
                {replies.length} {replies.length > 1 ? 'messages' : 'message'}, {voices}{' '}
                {voices > 1 ? 'personnes' : 'personne'}
              </p>
              <p className="sujet-story__preview">
                {previewLine(
                  last.body,
                  last.mediaKind,
                  lastAuthor?.label ?? null,
                  last.authorId === me,
                  'sujet',
                )}
              </p>
            </div>
            <Button variant="action" onClick={() => onOpen(false)}>
              Ouvrir
            </Button>
          </div>
        ) : mine ? (
          <p className="sujet-story__invite">Personne n’a encore répondu</p>
        ) : (
          <>
            <p className="sujet-story__invite">Sois le premier à répondre</p>
            <button type="button" className="sujet-story__reply" onClick={() => onOpen(true)}>
              Répondre à {author?.label ?? 'ce sujet'}…
            </button>
          </>
        )}
      </div>
    </section>
  )
}
