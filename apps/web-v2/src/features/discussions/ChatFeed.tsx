/**
 * QUOI     — le fil d'un tchat : les bulles en suites, le nom au début d'une suite, l'avatar à la
 *            fin, le jour qui change, les photos et vidéos, la double coche une fois lu.
 * POURQUOI — « que les gens s'y sentent bien » (Uriel, 04/11/2026) : bulles des autres en blanc
 *            sur le papier, les siennes à la couleur de la conversation, noms colorés en groupe.
 * ATTENTION — le fil défile seul, collé en bas, comme tout tchat : la page entière ne bouge pas.
 */
import { useEffect, useRef } from 'react'
import { CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { dayLabel, formatTime } from '@/lib/dates'
import type { Bubble, Person } from '@/lib/discussions'

/** Huit encres douces pour les noms d'un groupe, attribuées par ordre d'arrivée. */
const NAME_TONES = 8

interface Props {
  bubbles: Bubble[]
  people: Map<string, Person>
  urls: Map<string, string>
  /** Le plus ancien « lu jusqu'ici » des autres : avant, la double coche est pleine. */
  readByAllUntil: string | null
  group: boolean
}

export function ChatFeed({ bubbles, people, urls, readByAllUntil, group }: Props) {
  const end = useRef<HTMLDivElement>(null)
  const count = bubbles.length
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [count])

  const tones = new Map<string, number>()
  for (const person of people.keys()) tones.set(person, tones.size % NAME_TONES)
  const now = new Date()

  return (
    <div className="chat-feed">
      {bubbles.map((bubble) => {
        const author = people.get(bubble.authorId)
        const media = bubble.mediaPath ? urls.get(bubble.mediaPath) : undefined
        const read = !!readByAllUntil && bubble.createdAt <= readByAllUntil
        const row = ['chat-row', bubble.mine ? 'chat-row--mine' : 'chat-row--theirs']
        if (bubble.first) row.push('chat-row--first')
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
              <div className={shape.join(' ')}>
                {!bubble.mine && bubble.first && group && (
                  <p
                    className={`chat-bubble__name chat-bubble__name--${String(tones.get(bubble.authorId) ?? 0)}`}
                  >
                    {author?.label ?? 'Exposant'}
                  </p>
                )}
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
            </div>
          </div>
        )
      })}
      <div ref={end} />
    </div>
  )
}
