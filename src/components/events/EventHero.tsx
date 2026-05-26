// src/components/events/EventHero.tsx
import { Calendar, MapPin, Clock, Users, ExternalLink, FileText, Mail, StickyNote, Image } from 'lucide-react'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { Event } from '@/types/database'
import { participationChip } from '@/lib/explorer'

interface EventHeroProps {
  event: Event
  friendCount: number
  participationStatus?: string | null
  paymentStatus?: string | null
  isExposant?: boolean
  onParticipantsClick?: () => void
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function EventHero({ event, friendCount, participationStatus, paymentStatus, isExposant, onParticipantsClick }: EventHeroProps) {
  const chip = participationChip(participationStatus, paymentStatus, isExposant ? 'entity' : 'person', {
    isPast: new Date(event.end_date) < new Date(),
  })
  return (
    <div className="event-hero">
      {/* Poster */}
      <div className="event-poster">
        {event.image_url ? (
          <img src={event.image_url} alt={event.name} />
        ) : (
          <div className="event-poster-empty">
            <Image strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="event-info">
        <div className="event-tags">
          {event.tags?.map((tag, i) => {
            const I = getTagIcon(tag)
            return (
              <span key={tag} className={i === 0 ? 'event-tag-primary' : 'event-tag-secondary'}>
                <I size={12} strokeWidth={2} className="inline -mt-px" /> {tag}
              </span>
            )
          })}
        </div>

        <h1 className="event-title">{event.name}</h1>

        <div className="event-meta">
          <div className="event-meta-item">
            <Calendar strokeWidth={1.5} />
            <span>{formatDate(event.start_date)}{event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}</span>
          </div>
          <div className="event-meta-item">
            <MapPin strokeWidth={1.5} />
            <span>{event.city}, {event.department}</span>
          </div>
          {event.registration_deadline && (
            <div className="event-meta-item">
              <Clock strokeWidth={1.5} />
              <span>Inscription avant le {formatDate(event.registration_deadline)}</span>
            </div>
          )}
          {friendCount > 0 && (
            <div className="event-meta-item event-meta-clickable" onClick={onParticipantsClick} role="button">
              <Users strokeWidth={1.5} />
              <span>{friendCount} participant{friendCount > 1 ? 's' : ''}{participationStatus ? ' dont vous' : ''}</span>
            </div>
          )}
        </div>

        {/* Statut de participation (chip unifié) */}
        {chip && (
          <div className="event-badges">
            <span className={'event-badge-status ' + chip.variant}>{chip.label}</span>
          </div>
        )}

        {/* Links */}
        <div className="event-links">
          {event.registration_url && (
            <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="event-link-btn primary">
              <FileText strokeWidth={1.5} />
              S'inscrire
            </a>
          )}
          {event.external_url && (
            <a href={event.external_url} target="_blank" rel="noopener noreferrer" className="event-link-btn">
              <ExternalLink strokeWidth={1.5} />
              Site web
            </a>
          )}
          {event.contact_email && (
            <a href={`mailto:${event.contact_email}`} className="event-link-btn">
              <Mail strokeWidth={1.5} />
              {event.contact_email}
            </a>
          )}
        </div>

        {event.registration_note && (
          <div className="event-reg-note">
            <StickyNote strokeWidth={1.5} />
            <span>{event.registration_note}</span>
          </div>
        )}
      </div>
    </div>
  )
}
