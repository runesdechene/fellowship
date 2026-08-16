import { formatDayMonth } from '@/lib/dates'
import { parseSqlDate } from '@/lib/dates'
import type { EventDraft } from './useEventDraft'

/** « Du 13 au 14 juin » — ou juste « Le 13 juin » si la fin n'est pas donnée. */
function formatRange(draft: EventDraft): string | null {
  if (!draft.startDate) return null
  const start = parseSqlDate(draft.startDate)
  if (!draft.endDate || draft.endDate === draft.startDate) {
    return `Le ${formatDayMonth(start)}`
  }
  return `Du ${formatDayMonth(start)} au ${formatDayMonth(parseSqlDate(draft.endDate))}`
}

interface EventPreviewProps {
  draft: EventDraft
  /** L'affiche choisie, pas encore envoyée : on l'affiche depuis le navigateur. */
  posterUrl: string | null
}

/**
 * La fiche telle que les exposants la verront. Ce qui n'est pas encore
 * renseigné garde sa place, en éteint : la fiche dit ce qu'il reste à faire.
 */
export function EventPreview({ draft, posterUrl }: EventPreviewProps) {
  const range = formatRange(draft)
  const place = draft.city ? `${draft.city}${draft.department ? ` (${draft.department})` : ''}` : ''

  return (
    <div className="event-card">
      {posterUrl ? (
        <img className="event-card__poster-image" src={posterUrl} alt="" />
      ) : (
        <div className="event-card__poster">Affiche — étape 4</div>
      )}

      <div className="event-card__body">
        <span
          className={
            draft.name ? 'event-card__name' : 'event-card__name event-card__name--waiting'
          }
        >
          {draft.name || 'Sans nom pour l’instant'}
        </span>

        {range || place ? (
          <span className="event-card__meta">
            {range && <b>{range}</b>}
            {range && place && ' · '}
            {place && <b>{place}</b>}
          </span>
        ) : (
          <span className="event-card__meta event-card__meta--waiting">
            Lieu et dates — étape 2
          </span>
        )}

        {draft.tags.length > 0 ? (
          <div className="event-card__tags">
            {draft.tags.map((tag, index) => (
              <span key={tag} className={index === 0 ? 'tag tag--first' : 'tag tag--on'}>
                {tag}
              </span>
            ))}
          </div>
        ) : (
          !draft.isPrivate && (
            <span className="event-card__meta event-card__meta--waiting">
              Catégories — étape 3
            </span>
          )
        )}
      </div>
    </div>
  )
}
