/**
 * QUOI     — le fil d'un tchat : les bulles en suites, le nom au début d'une suite, l'avatar à la
 *            fin, le jour qui change, les photos et vidéos, la double coche une fois lu, et les
 *            réactions (appui long sur téléphone, survol sur ordinateur). Sur ses propres messages,
 *            le même geste propose aussi « Modifier » et « Supprimer », comme sur WhatsApp.
 * POURQUOI — « que les gens s'y sentent bien » (Uriel, 04/11/2026) : bulles des autres en blanc
 *            sur le papier, les siennes à la couleur de la conversation, noms colorés en groupe.
 * ATTENTION — le fil défile seul, collé en bas, comme tout tchat. Il se recolle en bas par son
 *            propre défilement, jamais par scrollIntoView, qui ferait aussi défiler la story au-dessus.
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCheck, Pencil, SmilePlus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { OfficialBadge } from '@/components/ui/OfficialBadge'
import { dayLabel, formatTime } from '@/lib/dates'
import type { Bubble, Person, ReactionSummary } from '@/lib/discussions'
import { FestivalAttachment } from './FestivalAttachment'
import { ReactionPicker } from './ReactionPicker'

/** Huit encres douces pour les noms d'un groupe, attribuées par ordre d'arrivée. */
const NAME_TONES = 8
/** L'appui long qui ouvre les réactions, comme sur WhatsApp. */
const LONG_PRESS = 450
/** La place qu'il faut au-dessus d'une bulle pour poser la rangée d'emojis, et le menu des siennes. */
const PICKER_ROOM = 72
const MENU_ROOM = 176

interface Props {
  bubbles: Bubble[]
  people: Map<string, Person>
  urls: Map<string, string>
  /** Le plus ancien « lu jusqu'ici » des autres : avant, la double coche est pleine. */
  readByAllUntil: string | null
  group: boolean
  reactions: Map<string, ReactionSummary>
  /** Absent quand on ne peut plus réagir (un sujet clôturé). */
  onReact?: (messageId: string, emoji: string | null) => void
  /** Absents eux aussi dans un sujet clôturé. */
  onEdit?: (bubble: Bubble) => void
  onDelete?: (messageId: string) => void
}

export function ChatFeed({
  bubbles,
  people,
  urls,
  readByAllUntil,
  group,
  reactions,
  onReact,
  onEdit,
  onDelete,
}: Props) {
  const feed = useRef<HTMLDivElement>(null)
  const press = useRef<number | undefined>(undefined)
  const [picking, setPicking] = useState<string | null>(null)
  const count = bubbles.length
  useEffect(() => {
    const element = feed.current
    if (element) element.scrollTop = element.scrollHeight
  }, [count])

  useEffect(() => {
    if (!picking) return
    // Échap referme les réactions seules : sans preventDefault, le tiroir (un <dialog>) se fermerait aussi.
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setPicking(null)
    }
    document.addEventListener('keydown', close, true)
    return () => document.removeEventListener('keydown', close, true)
  }, [picking])

  /** Ouvre les réactions d'une bulle, en faisant de la place au-dessus si elle est tout en haut. */
  function pick(id: string, from: Element) {
    const element = feed.current
    const row = from.closest('.chat-row')
    if (!onReact || !element || !row) return
    const needed = row.classList.contains('chat-row--mine') ? MENU_ROOM : PICKER_ROOM
    const room = row.getBoundingClientRect().top - element.getBoundingClientRect().top
    if (room < needed) element.scrollBy({ top: room - needed, behavior: 'smooth' })
    setPicking(id)
  }
  const cancelPress = () => window.clearTimeout(press.current)

  const tones = new Map<string, number>()
  for (const person of people.keys()) tones.set(person, tones.size % NAME_TONES)
  const now = new Date()

  return (
    <div ref={feed} className="chat-feed">
      {bubbles.map((bubble) => {
        const author = people.get(bubble.authorId)
        const media = bubble.mediaPath ? urls.get(bubble.mediaPath) : undefined
        const read = !!readByAllUntil && bubble.createdAt <= readByAllUntil
        const summary = reactions.get(bubble.id)
        const row = ['chat-row', bubble.mine ? 'chat-row--mine' : 'chat-row--theirs']
        if (bubble.first) row.push('chat-row--first')
        if (summary) row.push('chat-row--reacted')
        if (picking === bubble.id) row.push('chat-row--picked')
        const shape = ['chat-bubble']
        if (bubble.last) shape.push('chat-bubble--tail')
        if (bubble.mediaPath) shape.push('chat-bubble--media')
        return (
          <div key={bubble.id} className="chat-feed__item">
            {bubble.newDay && (
              <p className="chat-feed__day">
                <span>{dayLabel(new Date(bubble.createdAt), now)}</span>
              </p>
            )}
            <div className={row.join(' ')}>
              {!bubble.mine &&
                (bubble.last ? (
                  <Avatar className="chat-row__avatar" src={author?.avatar} name={author?.label} />
                ) : (
                  <span className="chat-row__avatar chat-row__avatar--empty" aria-hidden="true" />
                ))}
              <div
                className="chat-row__bubble"
                onPointerDown={(event) => {
                  const target = event.currentTarget
                  press.current = window.setTimeout(() => pick(bubble.id, target), LONG_PRESS)
                }}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(event) => {
                  if (!onReact) return
                  event.preventDefault()
                  pick(bubble.id, event.currentTarget)
                }}
              >
                {picking === bubble.id && onReact && (
                  <div className="chat-row__actions">
                    <ReactionPicker
                      mine={summary?.mine ?? null}
                      onPick={(emoji) => {
                        onReact(bubble.id, emoji === summary?.mine ? null : emoji)
                        setPicking(null)
                      }}
                    />
                    {bubble.mine && onEdit && onDelete && (
                      <div className="chat-row__menu">
                        {bubble.body && (
                          <button
                            type="button"
                            className="chat-row__option"
                            onClick={() => {
                              onEdit(bubble)
                              setPicking(null)
                            }}
                          >
                            <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                            Modifier
                          </button>
                        )}
                        <button
                          type="button"
                          className="chat-row__option chat-row__option--remove"
                          onClick={() => {
                            onDelete(bubble.id)
                            setPicking(null)
                          }}
                        >
                          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className={shape.join(' ')}>
                  {!bubble.mine && bubble.first && group && (
                    <p
                      className={`chat-bubble__name chat-bubble__name--${String(tones.get(bubble.authorId) ?? 0)}`}
                    >
                      {author?.label ?? 'Exposant'}
                      <OfficialBadge actorId={bubble.authorId} />
                    </p>
                  )}
                  {bubble.eventId && <FestivalAttachment eventId={bubble.eventId} />}
                  {bubble.mediaKind === 'image' && media && (
                    <img className="chat-bubble__media" src={media} alt="" />
                  )}
                  {bubble.mediaKind === 'video' && media && (
                    <video
                      className="chat-bubble__media"
                      src={media}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  )}
                  {bubble.mediaPath && !media && (
                    <span className="chat-bubble__media chat-bubble__media--wait" />
                  )}
                  {bubble.body && <p className="chat-bubble__text">{bubble.body}</p>}
                  <p className="chat-bubble__meta">
                    {bubble.editedAt && <span>modifié</span>}
                    {formatTime(new Date(bubble.createdAt))}
                    {bubble.mine && (
                      <CheckCheck
                        size={14}
                        aria-label={read ? 'Lu' : 'Envoyé'}
                        className={read ? 'chat-bubble__read' : undefined}
                      />
                    )}
                  </p>
                </div>
                {summary && (
                  <button
                    type="button"
                    className={summary.mine ? 'chat-reactions is-mine' : 'chat-reactions'}
                    aria-label={`${String(summary.total)} réaction${summary.total > 1 ? 's' : ''} : ${summary.emojis.join(' ')}`}
                    onClick={(event) => pick(bubble.id, event.currentTarget)}
                  >
                    <span aria-hidden="true">{summary.emojis.slice(0, 3).join('')}</span>
                    {summary.total > 1 && <span aria-hidden="true">{summary.total}</span>}
                  </button>
                )}
              </div>
              {onReact && (
                <button
                  type="button"
                  className="chat-row__react"
                  aria-label="Réagir"
                  onClick={(event) => pick(bubble.id, event.currentTarget)}
                >
                  <SmilePlus size={16} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {/* En dernier : le premier enfant du fil porte la marge qui colle les bulles en bas. */}
      {picking && (
        <button
          type="button"
          className="chat-feed__veil"
          aria-label="Fermer les réactions"
          onClick={() => setPicking(null)}
        />
      )}
    </div>
  )
}
