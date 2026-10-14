/**
 * QUOI     — l'écran Calendrier de la landing : quatre mois à venir, leurs vrais festivals à
 *            l'affiche, le statut de l'exposant de démonstration ; un mois vide dit « Mois libre ».
 * POURQUOI — maquette 2290:2 (nœud 2290:107), reproduite d'après le Calendrier de l'app ; les
 *            festivals viennent de la base (lib/landing.ts).
 * ATTENTION — rien n'est cliquable : c'est une image vivante du produit.
 */
import { PosterArt } from '@/components/ui/PosterArt'
import {
  daysUntil,
  formatCountdown,
  formatDateRange,
  formatMonthLabel,
  monthName,
} from '@/lib/dates'
import type { Showcase } from '@/lib/landing'
import { AppWindow } from './AppWindow'
import { DemoStatus } from './DemoStatus'

export function CalendarScreen({ months }: { months: Showcase['months'] }) {
  const today = new Date()
  const count = months.reduce((n, m) => n + m.events.length, 0)
  const next = months.flatMap((m) => m.events)[0]
  const last = months[months.length - 1]
  return (
    <AppWindow
      title="Calendrier"
      width={864}
      height={560}
      active="Calendrier"
      className="landing-shot--calendar"
    >
      <div className="landing-cal">
        <h3 className="landing-app__title">Calendrier</h3>
        <p className="landing-app__sub">
          <strong>
            {count} {count === 1 ? 'date' : 'dates'}
          </strong>
          {last ? ` d’ici ${monthName(last.month)}` : ''}
          {next ? (
            <>
              {' '}
              · la prochaine{' '}
              <strong>{formatCountdown(daysUntil(next.startDate, today)).toLowerCase()}</strong>
            </>
          ) : null}
        </p>
        <div className="landing-cal__months">
          {months.map(({ month, events }) => (
            <section key={month.toISOString()} className="landing-cal__month">
              <h4 className={events.length ? undefined : 'is-free'}>{formatMonthLabel(month)}</h4>
              <p className="landing-app__meta">
                {events.length === 0
                  ? 'Aucune date'
                  : `${String(events.length)} ${events.length === 1 ? 'date' : 'dates'}`}
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
