/**
 * QUOI     — ce qu'affiche la recherche plein écran : avant de taper, « Récemment » et « Par
 *            catégorie » (SearchStart) ; en tapant, les festivals à venir, les exposants et les
 *            dates passées (SearchResults).
 * POURQUOI — maquettes 2606:249 et 2606:301. Un groupe vide ne s'affiche pas.
 */
import { Clock } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Poster } from '@/components/ui/Poster'
import { formatDateRange } from '@/lib/dates'
import { eventPath } from '@/lib/event-path'
import type { SearchEvent } from '@/lib/event-search'
import type { TagRow } from '@/lib/tags'
import type { QuickResults } from './useQuickSearch'

const dateLine = (event: SearchEvent) =>
  `${formatDateRange(event.startDate, event.endDate, 'long')} ${String(event.startDate.getFullYear())}, ${event.city}`

export function SearchStart({
  recent,
  tags,
  onWords,
  onLeave,
}: {
  recent: string[]
  tags: TagRow[]
  onWords: (words: string) => void
  onLeave: (to: string) => void
}) {
  return (
    <>
      {recent.length > 0 && (
        <section className="search-overlay__group">
          <h2 className="search-overlay__group-title">Récemment</h2>
          <div className="search-overlay__chips">
            {recent.map((words) => (
              <button
                key={words}
                type="button"
                className="search-overlay__chip"
                onClick={() => {
                  onWords(words)
                }}
              >
                <Clock size={14} strokeWidth={2} />
                {words}
              </button>
            ))}
          </div>
        </section>
      )}
      {tags.length > 0 && (
        <section className="search-overlay__group">
          <h2 className="search-overlay__group-title">Par catégorie</h2>
          <div className="search-overlay__chips">
            {tags.map((tag) => (
              <button
                key={tag.slug}
                type="button"
                className="category-chip category-chip--chosen"
                // La puce d'Explorer (explorer.css), dans les couleurs de la catégorie (Tag.tsx).
                style={{ '--tag-bg': tag.bgColor, '--tag-ink': tag.textColor } as CSSProperties}
                onClick={() => {
                  onLeave(`/explorer?${new URLSearchParams({ categorie: tag.slug }).toString()}`)
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

export function SearchResults({
  results,
  words,
  onLeave,
}: {
  results: QuickResults
  words: string
  onLeave: (to: string) => void
}) {
  const { upcoming, exhibitors, past } = results
  if (upcoming.length + exhibitors.length + past.length === 0) {
    return <p className="search-overlay__empty">Rien pour « {words} » pour l’instant.</p>
  }
  return (
    <>
      {upcoming.length > 0 && (
        <section className="search-overlay__group">
          <h2 className="search-overlay__group-title">Festivals à venir</h2>
          <div className="search-overlay__posters">
            {upcoming.map((event) => (
              <button
                key={event.id}
                type="button"
                className="search-overlay__event"
                onClick={() => {
                  onLeave(eventPath(event.slug))
                }}
              >
                <Poster
                  imageUrl={event.imageUrl}
                  tags={event.tags}
                  className="search-overlay__poster"
                  cover={{
                    name: event.name,
                    city: event.city,
                    dates: formatDateRange(event.startDate, event.endDate),
                  }}
                />
                <span className="search-overlay__name">{event.name}</span>
                <span className="search-overlay__meta">{dateLine(event)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {(exhibitors.length > 0 || past.length > 0) && (
        <div className="search-overlay__columns">
          {exhibitors.length > 0 && (
            <section className="search-overlay__group">
              <h2 className="search-overlay__group-title">Exposants</h2>
              {exhibitors.map((exhibitor) => (
                <button
                  key={exhibitor.slug}
                  type="button"
                  className="search-overlay__row"
                  onClick={() => {
                    onLeave(`/${exhibitor.slug}`)
                  }}
                >
                  <Avatar
                    className="search-overlay__avatar"
                    src={exhibitor.avatarUrl}
                    name={exhibitor.name}
                  />
                  <span className="search-overlay__row-text">
                    <span className="search-overlay__name">{exhibitor.name}</span>
                    {exhibitor.craft && (
                      <span className="search-overlay__meta">{exhibitor.craft}</span>
                    )}
                  </span>
                </button>
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="search-overlay__group">
              <h2 className="search-overlay__group-title">Dates passées</h2>
              {past.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="search-overlay__row"
                  onClick={() => {
                    onLeave(eventPath(event.slug))
                  }}
                >
                  <Poster
                    imageUrl={event.imageUrl}
                    tags={event.tags}
                    className="search-overlay__thumb"
                  />
                  <span className="search-overlay__row-text">
                    <span className="search-overlay__name">{event.name}</span>
                    <span className="search-overlay__meta">{dateLine(event)}</span>
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </>
  )
}
