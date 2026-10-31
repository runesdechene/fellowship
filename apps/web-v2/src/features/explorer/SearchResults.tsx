/**
 * QUOI     — les résultats d'une recherche : le titre (« 31 résultats pour « Lyon » »), les onglets
 *            Tout · Festivals · Exposants · Passés, les festivals à venir, les exposants, puis les
 *            festivals passés, du plus récent au plus ancien (maquette 2584:504).
 * POURQUOI — on cherche une ville, un festival, un artisan ou une date passée au même endroit.
 * ATTENTION — l'onglet vit dans l'adresse (?voir=festivals|exposants|passes) ; « Tout » montre les
 *            cinq premiers festivals de chaque section, « Voir les N festivals » déplie le reste.
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

export type Tab = 'tout' | 'festivals' | 'exposants' | 'passes'

interface SearchResultsProps {
  label: string
  events: ExploreEvent[]
  past: ExploreEvent[]
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

/** Une section de festivals : son titre, son compte, et « Voir les N … » dans « Tout ». */
function EventSection({
  title,
  more,
  events,
  folded,
  onMark,
  past = false,
  hiddenCount = 0,
}: {
  title: string
  more: string
  events: ExploreEvent[]
  folded: boolean
  onMark: (event: ExploreEvent) => void
  past?: boolean
  hiddenCount?: number
}) {
  const [open, setOpen] = useState(false)
  const visible = folded && !open ? events.slice(0, FIRST_EVENTS) : events
  return (
    <section className="results__section">
      <header className="results__head">
        <h3 className="results__section-title">
          {title} <span>{events.length}</span>
        </h3>
        {folded && events.length > FIRST_EVENTS && (
          <button
            type="button"
            className="results__more"
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            {open ? 'Replier' : `Voir les ${String(events.length)} ${more}`}
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        )}
      </header>
      <div className="results__grid">
        {visible.map((event) => (
          <ExploreCard key={event.id} event={event} onMark={onMark} past={past} />
        ))}
        <ProEndCard count={hiddenCount} />
      </div>
    </section>
  )
}

export function SearchResults({
  label,
  events,
  past,
  exhibitors,
  tab,
  onTab,
  onMark,
  onFollow,
  hiddenCount,
}: SearchResultsProps) {
  const total = events.length + exhibitors.length + past.length
  const show = (section: Tab) => tab === 'tout' || tab === section

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'tout', label: 'Tout', count: total },
    { value: 'festivals', label: 'Festivals', count: events.length },
    { value: 'exposants', label: 'Exposants', count: exhibitors.length },
    { value: 'passes', label: 'Passés', count: past.length },
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

      {show('festivals') && events.length > 0 && (
        <EventSection
          title="Festivals"
          more="festivals"
          events={events}
          folded={tab === 'tout'}
          onMark={onMark}
          hiddenCount={hiddenCount}
        />
      )}

      {show('exposants') && exhibitors.length > 0 && (
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

      {show('passes') && past.length > 0 && (
        <EventSection
          title="Festivals passés"
          more="festivals passés"
          events={past}
          folded={tab === 'tout'}
          onMark={onMark}
          past
        />
      )}
    </div>
  )
}
