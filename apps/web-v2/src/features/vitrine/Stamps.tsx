/**
 * QUOI     — la route passée de l'artisan en tampons : une pastille ronde par festival, l'année
 *            dessous, le nom court ; au-delà de huit, un « +N ».
 * POURQUOI — l'ancienneté rassure un organisateur : « sur la route depuis 2019 » se lit d'un coup.
 *            Sur sa propre vitrine, un tampon ouvre son bilan (retour bêta, Uriel, 05/11/2026) ; un
 *            visiteur, lui, va à la fiche : un bilan parle d'argent, il ne se montre qu'à soi.
 */
import { Poster } from '@/components/ui/Poster'
import { Link } from 'react-router-dom'
import { stampYear } from '@/lib/dates'
import { stampName } from '@/lib/vitrine'
import type { VitrineDate } from './useVitrine'
import { eventPath } from '@/lib/event-path'
import { usePlan } from '@/lib/usePlan'

const MAX_STAMPS = 8

export function Stamps({ past, own }: { past: VitrineDate[]; own: boolean }) {
  const { pro } = usePlan()
  const oldest = past[past.length - 1]
  if (!oldest) return null
  const shown = past.slice(0, MAX_STAMPS)
  const more = past.length - shown.length
  // Sans le Pro, « Mes bilans » présente l'offre, comme « L'année dernière » sur la fiche.
  const pathOf = (eventId: string) =>
    own ? (pro ? `/bilans/${eventId}` : '/bilans') : eventPath(eventId)

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
          <Link key={date.eventId} to={pathOf(date.eventId)} className="stamp">
            <span className="stamp__circle">
              <Poster imageUrl={date.imageUrl} tags={date.tags} className="stamp__image" />
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
