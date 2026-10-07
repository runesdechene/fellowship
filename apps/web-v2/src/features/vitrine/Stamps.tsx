/**
 * QUOI     — la route passée de l'artisan en tampons : une pastille ronde par festival, l'année
 *            dessous, le nom court ; au-delà de huit, un « +N ».
 * POURQUOI — l'ancienneté rassure un organisateur : « sur la route depuis 2019 » se lit d'un coup.
 */
import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { stampName, stampYear } from '@/lib/vitrine'
import type { VitrineDate } from './useVitrine'

const MAX_STAMPS = 8

export function Stamps({ past }: { past: VitrineDate[] }) {
  const oldest = past[past.length - 1]
  if (!oldest) return null
  const shown = past.slice(0, MAX_STAMPS)
  const more = past.length - shown.length

  return (
    <section className="vitrine-section">
      <h2 className="vitrine-section__title">
        Sur la route depuis {oldest.startDate.getFullYear()}
        <span className="vitrine-section__count">
          {past.length} {past.length > 1 ? 'festivals' : 'festival'}
        </span>
      </h2>
      <div className="stamps">
        {shown.map((date) => (
          <Link key={date.eventId} to={`/evenement/${date.eventId}`} className="stamp">
            <span className="stamp__circle">
              {date.imageUrl ? (
                <img className="stamp__image" src={date.imageUrl} alt="" />
              ) : (
                <CalendarDays className="stamp__placeholder" size={40} strokeWidth={1.2} />
              )}
              <span className="stamp__year">{stampYear(date.startDate)}</span>
            </span>
            <span className="stamp__name">{stampName(date.name)}</span>
          </Link>
        ))}
        {more > 0 && <span className="stamp__more">+{more}</span>}
      </div>
    </section>
  )
}
