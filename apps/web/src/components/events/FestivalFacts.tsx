import { Calendar, Clock, MapPin, Users, FileText, Store } from 'lucide-react'
import type { Event } from '@/types/database'

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function datesLabel(event: Event) {
  if (event.end_date && event.end_date !== event.start_date) {
    return `${shortDate(event.start_date)} – ${shortDate(event.end_date)}`
  }
  return shortDate(event.start_date)
}

function deadlineLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Fact {
  icon: typeof Calendar
  label: string
  value: string
}

/**
 * Grille « Infos pratiques » — n'affiche que les cellules renseignées.
 * Dates + Lieu sont toujours présents ; le reste est conditionnel.
 */
export function FestivalFacts({ event }: { event: Event }) {
  const facts: Fact[] = [
    { icon: Calendar, label: 'Dates', value: datesLabel(event) },
  ]
  if (event.opening_hours) facts.push({ icon: Clock, label: 'Horaires', value: event.opening_hours })
  facts.push({ icon: MapPin, label: 'Lieu', value: `${event.city} (${event.department})` })
  if (event.expected_attendance) facts.push({ icon: Users, label: 'Affluence attendue', value: event.expected_attendance })
  if (event.registration_deadline) facts.push({ icon: FileText, label: 'Candidatures jusqu\'au', value: deadlineLabel(event.registration_deadline) })
  if (event.stand_price || event.stand_size) {
    const label = event.stand_size ? `Emplacement (${event.stand_size})` : 'Emplacement'
    facts.push({ icon: Store, label, value: event.stand_price ?? '—' })
  }

  return (
    <div className="glass-card event-section-card">
      <div className="event-section-title">Infos pratiques</div>
      <div className="fest-facts">
        {facts.map((f) => {
          const Icon = f.icon
          return (
            <div className="fest-fact" key={f.label}>
              <Icon strokeWidth={1.8} />
              <div className="fest-fact-text">
                <small>{f.label}</small>
                <b>{f.value}</b>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
