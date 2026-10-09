/**
 * QUOI     — les résultats d'une recherche : le titre (« 22 résultats pour « Lyon » »), les onglets
 *            Tout · Festivals · Exposants, la grille des festivals et les cartes d'exposants.
 * POURQUOI — on cherche une ville, un festival ou un artisan au même endroit (maquette 2027).
 * ATTENTION — l'onglet vit dans l'adresse (?voir=festivals|exposants) ; « Tout » montre les cinq
 *            premiers festivals, « Voir les N festivals » déplie le reste.
 */
import { ArrowRight, Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resultsTitle } from '@/lib/explorer'
import { initials } from '@/lib/vitrine'
import { ExploreCard } from './ExploreCard'
import { ProEndCard } from './ProEndCard'
import type { Exhibitor, ExploreEvent } from './useExplorer'

const FIRST_EVENTS = 5

type Tab = 'tout' | 'festivals' | 'exposants'

interface SearchResultsProps {
  label: string
  events: ExploreEvent[]
  exhibitors: Exhibitor[]
  tab: Tab
  onTab: (tab: Tab) => void
  onMark: (event: ExploreEvent) => void
  onFollow: (exhibitor: Exhibitor) => void
  /** En gratuit : les festivals au-delà des 6 mois, annoncés au bout des résultats. */
  hiddenCount: number
}

function ExhibitorCard({
  exhibitor,
  onFollow,
}: {
  exhibitor: Exhibitor
  onFollow: (exhibitor: Exhibitor) => void
}) {
  return (
    <article className="exhibitor-card">
      <Link to={`/${exhibitor.slug}`} className="exhibitor-card__identity">
        <span className="exhibitor-card__logo">
          {exhibitor.avatarUrl ? (
            <img src={exhibitor.avatarUrl} alt="" />
          ) : (
            initials(exhibitor.name)
          )}
        </span>
        <b className="exhibitor-card__name">{exhibitor.name}</b>
        <span className="exhibitor-card__meta">
          {[exhibitor.craft, exhibitor.place].filter(Boolean).join(' · ')}
        </span>
      </Link>
      <button
        type="button"
        className="exhibitor-card__follow"
        aria-pressed={exhibitor.following}
        onClick={() => {
          onFollow(exhibitor)
        }}
      >
        {exhibitor.following ? (
          <Check size={14} strokeWidth={2} />
        ) : (
          <Plus size={14} strokeWidth={2} />
        )}
        {exhibitor.following ? 'Suivi' : 'Suivre'}
      </button>
    </article>
  )
}

export function SearchResults({
  label,
  events,
  exhibitors,
  tab,
  onTab,
  onMark,
  onFollow,
  hiddenCount,
}: SearchResultsProps) {
  const [allEvents, setAllEvents] = useState(false)
  const total = events.length + exhibitors.length
  const showEvents = tab !== 'exposants'
  const showExhibitors = tab !== 'festivals'
  const visibleEvents = tab === 'tout' && !allEvents ? events.slice(0, FIRST_EVENTS) : events

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'tout', label: 'Tout', count: total },
    { value: 'festivals', label: 'Festivals', count: events.length },
    { value: 'exposants', label: 'Exposants', count: exhibitors.length },
  ]

  return (
    <div className="results">
      <h2 className="results__title">{resultsTitle(total, label)}</h2>
      <div className="results__tabs" role="group" aria-label="Type de résultats">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            className="results__tab"
            aria-pressed={tab === item.value}
            onClick={() => {
              onTab(item.value)
            }}
          >
            {item.label} <span>{item.count}</span>
          </button>
        ))}
      </div>

      {showEvents && events.length > 0 && (
        <section className="results__section">
          <header className="results__head">
            <h3 className="results__section-title">
              Festivals <span>{events.length}</span>
            </h3>
            {tab === 'tout' && events.length > FIRST_EVENTS && (
              <button
                type="button"
                className="results__more"
                onClick={() => {
                  setAllEvents((value) => !value)
                }}
              >
                {allEvents ? 'Replier' : `Voir les ${events.length} festivals`}
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            )}
          </header>
          <div className="results__grid">
            {visibleEvents.map((event) => (
              <ExploreCard key={event.id} event={event} onMark={onMark} />
            ))}
            <ProEndCard count={hiddenCount} />
          </div>
        </section>
      )}

      {showExhibitors && exhibitors.length > 0 && (
        <section className="results__section">
          <header className="results__head">
            <h3 className="results__section-title">
              Exposants <span>{exhibitors.length}</span>
            </h3>
          </header>
          <div className="results__exhibitors">
            {exhibitors.map((exhibitor) => (
              <ExhibitorCard key={exhibitor.actorId} exhibitor={exhibitor} onFollow={onFollow} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
