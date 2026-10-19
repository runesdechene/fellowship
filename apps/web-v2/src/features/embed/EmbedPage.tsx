/**
 * QUOI     — `/:slug/embed`, le calendrier d'une enseigne affiché sur le site d'un artiste :
 *            l'en-tête, les prochaines dates, « Voir les autres », le pied Fellowship.
 * POURQUOI — lot 12 : les calendriers collés sur des sites du temps de la V1 doivent continuer de
 *            s'afficher après la bascule, sans que les artistes y touchent.
 * ATTENTION — aucune coque, aucune session : la page vit dans une iframe. Son fond est transparent
 *            et son thème suit le site hôte, pas l'app (embed.css). Les liens ouvrent Fellowship
 *            dans un nouvel onglet.
 */
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Tag } from '@/components/ui/Tag'
import { durationLabel, formatMonthAbbr, parseSqlDate } from '@/lib/dates'
import { parseEmbedParams } from '@/lib/embed'
import { tagStyleFor } from '@/lib/tags'
import { useEmbed } from './useEmbed'
import { useHostTheme, useReportHeight } from './useHostFrame'

interface EmbedFrameProps {
  theme: 'light' | 'dark'
  maxWidth: number | null
  accent: string
  children: ReactNode
}

/** Le cadre : le thème du site hôte, la largeur et la couleur choisies dans l'adresse. */
function EmbedFrame({ theme, maxWidth, accent, children }: EmbedFrameProps) {
  return (
    <div
      className={`embed embed--${theme}`}
      style={
        {
          '--embed-max-width': maxWidth ? `${String(maxWidth)}px` : '100%',
          '--embed-accent': accent,
        } as CSSProperties
      }
    >
      <div className="embed__column">{children}</div>
    </div>
  )
}

export function EmbedPage() {
  const slug = (useParams().slug ?? '').replace(/^@/, '')
  const [search] = useSearchParams()
  const { theme, max, accent, maxWidth, preview, showHeader } = parseEmbedParams(search)
  const state = useEmbed(slug, max)
  const resolvedTheme = useHostTheme(theme)
  const [expanded, setExpanded] = useState(false)
  useReportHeight()

  if (state.kind !== 'ready') {
    return (
      <EmbedFrame theme={resolvedTheme} maxWidth={maxWidth} accent={accent}>
        <p className="embed__message">
          {state.kind === 'loading'
            ? 'Chargement…'
            : state.kind === 'missing'
              ? 'Profil introuvable'
              : 'Le calendrier n’a pas pu se charger.'}
        </p>
      </EmbedFrame>
    )
  }

  const { entity, dates, tagStyles } = state
  const subtitle = [entity.craft, entity.city].filter(Boolean).join(' · ')
  const collapsible = preview > 0 && dates.length > preview
  const visible = collapsible && !expanded ? dates.slice(0, preview) : dates
  const hidden = dates.length - preview

  return (
    <EmbedFrame theme={resolvedTheme} maxWidth={maxWidth} accent={accent}>
      {showHeader && (
        <header className="embed__header">
          {entity.avatarUrl ? (
            <img src={entity.avatarUrl} alt={entity.name} className="embed__avatar" />
          ) : (
            <span className="embed__avatar embed__avatar--initial">
              {entity.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="embed__name">{entity.name}</span>
          {subtitle && <span className="embed__subtitle">{subtitle}</span>}
        </header>
      )}

      {dates.length === 0 ? (
        <div className="embed__empty">
          <CalendarDays size={40} strokeWidth={1.5} />
          <p>Aucun événement à venir</p>
        </div>
      ) : (
        <div className="embed__dates">
          {visible.map((date) => {
            const start = parseSqlDate(date.start_date)
            const place = [date.city, date.department ? `(${date.department})` : null]
              .filter(Boolean)
              .join(' ')
            return (
              <a
                key={date.id}
                href={`${window.location.origin}/evenement/${date.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-date"
              >
                <span className="embed-date__day">
                  <b>{start.getDate()}</b>
                  <span>{formatMonthAbbr(start)}</span>
                  <i>{start.getFullYear()}</i>
                </span>
                <span className="embed-date__poster">
                  {date.image_url && <img src={date.image_url} alt="" loading="lazy" />}
                </span>
                <span className="embed-date__info">
                  <span className="embed-date__name">{date.name}</span>
                  {date.tags && date.tags.length > 0 && (
                    <span className="embed-date__tags">
                      {date.tags.slice(0, 3).map((tag) => (
                        <Tag key={tag} name={tag} style={tagStyleFor(tagStyles, tag)} />
                      ))}
                    </span>
                  )}
                  {place && (
                    <span className="embed-date__place">
                      <MapPin size={15} strokeWidth={1.8} />
                      {place}
                    </span>
                  )}
                  <span className="embed-date__duration">
                    <Clock size={14} strokeWidth={1.8} />
                    {durationLabel(start, parseSqlDate(date.end_date))}
                  </span>
                </span>
                <span className="embed-date__chevron" aria-hidden="true">
                  ›
                </span>
              </a>
            )
          })}
        </div>
      )}

      {collapsible && (
        <button
          type="button"
          className="embed__more"
          onClick={() => {
            setExpanded(!expanded)
          }}
        >
          {expanded
            ? 'Voir moins'
            : `Voir les ${String(hidden)} autre${hidden > 1 ? 's' : ''} date${hidden > 1 ? 's' : ''}`}
        </button>
      )}

      <footer className="embed__foot">
        <a
          className="embed__brand"
          href={`${window.location.origin}/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
          <span>
            Fellowship<span className="embed__brand-dot">.</span>
          </span>
        </a>
        <p className="embed__slogan">
          Propulsé par Fellowship — le réseau qui fait tourner les festivals
        </p>
      </footer>
    </EmbedFrame>
  )
}
