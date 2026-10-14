/**
 * QUOI     — l'écran Calendrier de la landing : la frise des douze mois en haut à droite, puis les
 *            mois à venir et leurs vrais festivals à l'affiche, le statut de l'exposant de
 *            démonstration ; un mois vide dit « Mois libre ».
 * POURQUOI — maquette 2290:2 (nœud 2290:107), reproduite d'après le Calendrier de l'app. Le compte
 *            de démonstration est Pro : il voit douze mois (Uriel, 14/10/2026).
 * ATTENTION — rien n'est cliquable : c'est une image vivante du produit. Cinq colonnes sont
 *            posées, la cinquième dépasse de la fenêtre comme dans l'app, où la frise glisse.
 */
import type { CSSProperties } from 'react'
import { PosterArt } from '@/components/ui/PosterArt'
import {
  daysUntil,
  formatCountdown,
  formatDateRange,
  formatMonthAbbr,
  formatMonthLabel,
  monthName,
} from '@/lib/dates'
import type { Showcase } from '@/lib/landing'
import { AppWindow } from './AppWindow'
import { DemoStatus } from './DemoStatus'

const COLUMNS = 5
const IN_VIEW = 4

export function CalendarScreen({ months }: { months: Showcase['months'] }) {
  const today = new Date()
  const count = months.reduce((n, m) => n + m.count, 0)
  const next = months.flatMap((m) => m.events)[0]
  const last = months[months.length - 1]
  const busiest = Math.max(1, ...months.map((m) => m.count))
  return (
    <AppWindow
      title="Calendrier"
      width={864}
      height={560}
      active="Calendrier"
      className="landing-shot--calendar"
    >
      <div className="landing-cal">
        <div className="landing-cal__head">
          <div>
            <h3 className="landing-app__title">Calendrier</h3>
            <p className="landing-app__sub">
              <strong>
                {count} {count === 1 ? 'date' : 'dates'}
              </strong>
              {last ? ` d’ici ${monthName(last.month)} ${String(last.month.getFullYear())}` : ''}
              {next ? (
                <>
                  {' '}
                  · la prochaine{' '}
                  <strong>{formatCountdown(daysUntil(next.startDate, today)).toLowerCase()}</strong>
                </>
              ) : null}
            </p>
          </div>
          <div
            className="landing-cal__nav"
            style={{ '--window-size': String(IN_VIEW / months.length) } as CSSProperties}
          >
            <span className="landing-cal__window" />
            {months.map((m, k) => (
              <span
                key={m.month.toISOString()}
                className={`landing-cal__bar${k < IN_VIEW ? ' is-in-view' : ''}`}
              >
                <i
                  className={m.count ? undefined : 'is-empty'}
                  style={{ '--bar-ratio': String(m.count / busiest) } as CSSProperties}
                />
                <small>{formatMonthAbbr(m.month)}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="landing-cal__months">
          {months.slice(0, COLUMNS).map(({ month, count: inMonth, events }) => (
            <section key={month.toISOString()} className="landing-cal__month">
              <h4 className={events.length ? undefined : 'is-free'}>{formatMonthLabel(month)}</h4>
              <p className="landing-app__meta">
                {inMonth === 0
                  ? 'Aucune date'
                  : `${String(inMonth)} ${inMonth === 1 ? 'date' : 'dates'}`}
              </p>
              {events.length === 0 ? (
                <div className="landing-cal__free">
                  <span>Mois libre</span>
                  <strong>Trouver une date en {monthName(month)} →</strong>
                </div>
              ) : (
                events.map((event) => (
                  <article key={event.id} className="landing-cal__date">
                    <PosterArt
                      imageUrl={event.imageUrl}
                      tags={event.tags}
                      startDate={event.startDate}
                      daysAway={daysUntil(event.startDate, today)}
                      friends={[]}
                    />
                    <div className="landing-cal__line">
                      <strong>{event.name}</strong>
                      <DemoStatus status={event.status} />
                    </div>
                    <p className="landing-app__meta">
                      {formatDateRange(event.startDate, event.endDate)} · {event.place}
                    </p>
                  </article>
                ))
              )}
            </section>
          ))}
        </div>
      </div>
    </AppWindow>
  )
}
