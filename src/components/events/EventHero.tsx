// src/components/events/EventHero.tsx
import { Calendar, MapPin, Clock, Users, ExternalLink, FileText, Mail, StickyNote, Image } from 'lucide-react'
import type { Event } from '@/types/database'

interface EventHeroProps {
  event: Event
  friendCount: number
  participationStatus?: string | null
  paymentStatus?: string | null
  onParticipantsClick?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

const PAYMENT_LABELS: Record<string, string> = {
  a_payer: 'À payer',
  en_cours_paiement: 'En cours',
  paye: 'Payé',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function EventHero({ event, friendCount, participationStatus, paymentStatus, onParticipantsClick }: EventHeroProps) {
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
          <span className="event-tag-primary">{event.primary_tag}</span>
          {event.tags?.map(tag => (
            <span key={tag} className="event-tag-secondary">{tag}</span>
          ))}
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

        {/* Status + payment badges */}
        {participationStatus && (
          <div className="event-badges">
            <span
              className="event-badge-status"
              style={
                participationStatus === 'inscrit'
                  ? { background: 'hsl(152 50% 38%)', color: 'white' }
                  : participationStatus === 'en_cours'
                    ? { background: 'hsl(210 60% 50%)', color: 'white' }
                    : { background: 'hsl(38 90% 50%)', color: 'white' }
              }
            >
              ✓ {STATUS_LABELS[participationStatus] ?? participationStatus}
            </span>
            {participationStatus === 'inscrit' && paymentStatus && (
              <span
                className="event-badge-status"
                style={
                  paymentStatus === 'paye'
                    ? { background: 'hsl(152 50% 38% / 0.12)', color: 'hsl(152 50% 32%)', border: '1px solid hsl(152 50% 38% / 0.25)' }
                    : paymentStatus === 'en_cours_paiement'
                      ? { background: 'hsl(38 90% 50% / 0.12)', color: 'hsl(38 80% 35%)', border: '1px solid hsl(38 90% 50% / 0.2)' }
                      : { background: 'hsl(0 65% 55% / 0.08)', color: 'hsl(0 65% 45%)', border: '1px solid hsl(0 65% 55% / 0.15)' }
                }
              >
                💰 {PAYMENT_LABELS[paymentStatus] ?? paymentStatus}
              </span>
            )}
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
