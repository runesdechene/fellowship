/**
 * QUOI     — l'écran d'accueil d'un compte Pro dans la landing : « Bonjour, Atelier Corne & Cuir »,
 *            la saison en barres, la prochaine date, « À venir », « Pour toi », puis ce qui reste à
 *            payer et les bilans.
 * POURQUOI — maquette 2290:2 (nœud 2290:1334), reproduite d'après le tableau de bord de l'app ; les
 *            dossiers et les bilans y sont (Uriel, 14/10/2026 : « il manque des éléments »). La
 *            maquette disait « Bonjour, Runes de Chêne » : jamais les chiffres d'un vrai exposant.
 * ATTENTION — les festivals viennent de la base ; le nom, les statuts, les montants et les raisons
 *            de « Pour toi » sont de démonstration.
 */
import { ArrowRight } from 'lucide-react'
import { Poster } from '@/components/ui/Poster'
import { PosterArt } from '@/components/ui/PosterArt'
import {
  daysUntil,
  formatCountdown,
  formatDateRange,
  formatDaysShort,
  formatFullDate,
  formatMonthAbbr,
} from '@/lib/dates'
import { posterThumb } from '@/lib/poster-thumb'
import { paymentOf, type Showcase, type ShowEvent } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { AppWindow } from './AppWindow'
import { DemoStatus } from './DemoStatus'

const Thumb = ({ event, className }: { event: ShowEvent; className: string }) => (
  <Poster
    imageUrl={event.imageUrl ? posterThumb(event.imageUrl, 120) : null}
    tags={event.tags}
    className={className}
  />
)

export function ForYouScreen({ showcase }: { showcase: Showcase }) {
  const today = new Date()
  const { months, dossiers, forYou, reports } = showcase
  const next = dossiers[0]
  const total = months.reduce((n, m) => n + m.count, 0)
  return (
    <AppWindow
      title="Pour toi"
      width={864}
      height={640}
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
          {months.map((m, k) => (
            <span key={m.month.toISOString()} className={k === 0 ? 'is-now' : undefined}>
              <i className={m.count ? `has-${String(Math.min(m.count, 3))}` : undefined}>
                {m.count || null}
              </i>
              <small>{formatMonthAbbr(m.month)}</small>
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
                  <Thumb event={e} className="landing-you__thumb" />
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
        <div className="landing-you__row">
          {dossiers.length > 0 && (
            <section>
              <h4 className="landing-app__section">Mes dossiers</h4>
              <div className="landing-you__dossiers">
                {dossiers.map((d) => {
                  const pay = paymentOf(d.paid, d.total)
                  return (
                    <p key={d.id}>
                      <Thumb event={d} className="landing-you__thumb landing-you__thumb--s" />
                      <span>
                        <strong>{d.name}</strong>
                        <small>{formatDateRange(d.startDate, d.endDate)}</small>
                      </span>
                      <span>
                        <strong>{pay.label}</strong>
                        <small>{pay.note}</small>
                      </span>
                    </p>
                  )
                })}
              </div>
            </section>
          )}
          <section>
            <h4 className="landing-app__section">Mes bilans</h4>
            <div className="landing-you__reports">
              <p className="landing-you__season">
                <small>Bénéfice {today.getFullYear()}</small>
                <strong>{formatSignedEuros(DEMO.season.profit)}</strong>
                <small>
                  sur <b>{formatEuros(DEMO.season.revenue)}</b> de chiffre d’affaires
                </small>
              </p>
              {reports.map((r) => (
                <p key={r.id} className="landing-you__report">
                  <Thumb event={r} className="landing-you__thumb landing-you__thumb--s" />
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {formatFullDate(r.startDate)}
                      {r.revenue !== null && ` · ${formatEuros(r.revenue)}`}
                    </small>
                  </span>
                  {r.net !== null ? (
                    <b>{formatSignedEuros(r.net)}</b>
                  ) : (
                    <em>
                      Bilan à remplir <ArrowRight size={12} strokeWidth={2} />
                    </em>
                  )}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppWindow>
  )
}
