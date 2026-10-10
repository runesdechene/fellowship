/**
 * QUOI     — « Ça se rassemble » : le festival à venir où vont le plus de comptes suivis, que
 *            l'exposant n'a pas encore repéré, avec Repérer.
 * POURQUOI — lot 9a, maquette 2212:2 : la meilleure raison de regarder le fil, posée en tête.
 */
import { Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import type { FeedLine } from '@/lib/community'
import { formatDateRange, parseSqlDate } from '@/lib/dates'

interface GatheringProps {
  line: FeedLine
  onMark: (eventId: string) => Promise<void>
}

export function Gathering({ line, onMark }: GatheringProps) {
  const [busy, setBusy] = useState(false)
  if (!line.event) return null
  const { event } = line
  const dates = formatDateRange(parseSqlDate(event.startDate), parseSqlDate(event.endDate))
  const place = event.city
    ? ` · ${event.city}${event.department ? ` (${event.department})` : ''}`
    : ''
  const count = Number(line.detail ?? line.companions.length)

  async function mark(eventId: string) {
    setBusy(true)
    try {
      await onMark(eventId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="gathering" aria-label="Ça se rassemble">
      <Link className="gathering__poster-link" to={`/evenement/${event.id}`}>
        {event.imageUrl ? (
          <img className="gathering__poster" src={event.imageUrl} alt="" />
        ) : (
          <span className="gathering__poster" />
        )}
      </Link>
      <div className="gathering__body">
        <span className="gathering__eyebrow">Ça se rassemble</span>
        <Link className="gathering__name" to={`/evenement/${event.id}`}>
          {event.name}
        </Link>
        <span className="gathering__meta">
          {dates}
          {place}
        </span>
        <span className="gathering__companions">
          <AvatarStack>
            {line.companions.map((companion) => (
              <Avatar
                key={companion.id}
                className="gathering__face"
                src={companion.avatarUrl}
                name={companion.name}
              />
            ))}
          </AvatarStack>
          <span>
            <b>
              {count} {count === 1 ? 'compagnon' : 'compagnons'}
            </b>{' '}
            {count === 1 ? 'y va' : 'y vont'}
          </span>
        </span>
        <button
          type="button"
          className="gathering__mark"
          onClick={() => void mark(event.id)}
          disabled={busy}
        >
          <Star size={13} strokeWidth={2} />
          Repérer
        </button>
      </div>
    </section>
  )
}
