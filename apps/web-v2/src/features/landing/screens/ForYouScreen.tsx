/**
 * QUOI     — l'écran d'accueil d'un compte Pro dans la landing : « Bonjour, Atelier Corne & Cuir »,
 *            la saison en barres, la prochaine date, « À venir » et « Pour toi ».
 * POURQUOI — maquette 2290:2 (nœud 2290:1334), reproduite d'après le tableau de bord de l'app. La
 *            maquette disait « Bonjour, Runes de Chêne » : jamais un vrai exposant (spec du lot 11c).
 * ATTENTION — les festivals viennent de la base ; le nom, les statuts et les raisons de « Pour
 *            toi » sont de démonstration.
 */
import { PosterArt } from '@/components/ui/PosterArt'
import {
  daysUntil,
  formatCountdown,
  formatDateRange,
  formatDaysShort,
  formatMonthAbbr,
} from '@/lib/dates'
import { posterThumb, type Showcase } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { AppWindow } from './AppWindow'
import { DemoStatus } from './DemoStatus'

const BARS = 12

export function ForYouScreen({ showcase }: { showcase: Showcase }) {
  const today = new Date()
  const { months, dossiers, forYou } = showcase
  const next = dossiers[0]
  const total = months.reduce((n, m) => n + m.events.length, 0)
  const bars = Array.from({ length: BARS }, (_, k) => ({
    month: new Date(today.getFullYear(), today.getMonth() + k, 1),
    count: months[k]?.events.length ?? 0,
  }))
  return (
    <AppWindow
      title="Pour toi"
      width={864}
      height={540}
      active="Tableau de bord"
      className="landing-shot--foryou"
    >
      <div className="landing-you">
        <div className="landing-you__hello">
          <span className="landing-app__avatar">{DEMO.initials}</span>
          <div>
            <h3 className="landing-you__title">
              Bonjour, <strong>{DEMO.name}</strong>
            </h3>
            <p className="landing-app__meta">
              <strong>
                {total} {total === 1 ? 'date prévue' : 'dates prévues'}
              </strong>{' '}
              à ce jour
            </p>
          </div>
        </div>
        <div className="landing-you__bars">
          {bars.map((b, k) => (
            <span key={b.month.toISOString()} className={k === 0 ? 'is-now' : undefined}>
              <i className={b.count ? `has-${String(Math.min(b.count, 3))}` : undefined}>
                {b.count || null}
              </i>
              <small>{formatMonthAbbr(b.month)}</small>
            </span>
          ))}
        </div>
        {next && (
          <div className="landing-you__row">
            <section>
              <h4 className="landing-app__section">Ma prochaine date</h4>
              <article className="landing-you__next">
                <PosterArt
                  imageUrl={next.imageUrl}
                  tags={next.tags}
                  startDate={next.startDate}
                  daysAway={daysUntil(next.startDate, today)}
                  friends={[]}
                  badge={null}
                />
                <div>
                  <p className="landing-you__name">{next.name}</p>
                  <p className="landing-app__meta">
                    {formatDateRange(next.startDate, next.endDate, 'long')} · {next.place}
                  </p>
                  <p className="landing-you__pills">
                    <span>{formatCountdown(daysUntil(next.startDate, today))}</span>
                    <DemoStatus status={next.status} />
                  </p>
                </div>
              </article>
            </section>
            <section>
              <h4 className="landing-app__section">À venir</h4>
              <div className="landing-you__soon">
                {dossiers.slice(1, 4).map((d) => (
                  <p key={d.id}>
                    <strong>{d.name}</strong>
                    <small>
                      {formatDaysShort(daysUntil(d.startDate, today))} · {d.place}
                    </small>
                  </p>
                ))}
              </div>
            </section>
          </div>
        )}
        {forYou.length > 0 && (
          <section>
            <h4 className="landing-app__section">Pour toi</h4>
            <p className="landing-app__meta">
              Des festivals proches de ceux que tu fais, trouvés par Fellowship
            </p>
            <div className="landing-you__picks">
              {forYou.map((e) => (
                <span key={e.id}>
                  {e.imageUrl ? <img src={posterThumb(e.imageUrl, 120)} alt="" /> : <i />}
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {formatDateRange(e.startDate, e.endDate)} · {e.place}
                    </small>
                    {next && <small className="landing-you__why">Proche de {next.name}</small>}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppWindow>
  )
}
