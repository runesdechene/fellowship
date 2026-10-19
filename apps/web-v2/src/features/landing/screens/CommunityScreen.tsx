/**
 * QUOI     — l'écran Communauté de la landing : « Ça se rassemble » sur le festival à venir le plus
 *            suivi, le fil de la tribu, « Où vous vous croiserez » et « Tu connais peut-être ».
 * POURQUOI — maquette 2290:2 (nœud 2290:653), reproduite d'après la Communauté de l'app. Les
 *            festivals et le nombre d'inscrits viennent de la base ; les prénoms sont de démonstration.
 * ATTENTION — jamais le nom d'un vrai exposant : le fil et « Tu connais peut-être » sont des démonstrations.
 */
import { Plus, Star } from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import { posterThumb, type Showcase, type ShowEvent } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { AppWindow } from './AppWindow'

function MiniEvent({ event }: { event: ShowEvent }) {
  return (
    <span className="landing-com__mini">
      {event.imageUrl ? <img src={posterThumb(event.imageUrl, 80)} alt="" /> : <i />}
      <span>
        <strong>{event.name}</strong>
        <small>
          {formatDateRange(event.startDate, event.endDate)} · {event.place}
        </small>
      </span>
    </span>
  )
}

export function CommunityScreen({ showcase }: { showcase: Showcase }) {
  const { crowd, dossiers, recent } = showcase
  const going = dossiers[0]
  const added = recent[0]
  return (
    <AppWindow
      title="Communauté"
      width={864}
      height={470}
      active="Communauté"
      className="landing-shot--community"
    >
      <h3 className="landing-app__title">Communauté</h3>
      <p className="landing-app__sub">
        Ce que vit ta tribu, et les nouveaux festivals sur Fellowship.
      </p>
      <div className="landing-com">
        <div className="landing-com__main">
          {crowd && (
            <article className="landing-com__crowd">
              {crowd.event.imageUrl ? (
                <img src={posterThumb(crowd.event.imageUrl, 300)} alt="" />
              ) : (
                <i />
              )}
              <div>
                <small>Ça se rassemble</small>
                <h4>{crowd.event.name}</h4>
                <p className="landing-app__meta">
                  {formatDateRange(crowd.event.startDate, crowd.event.endDate)} ·{' '}
                  {crowd.event.place}
                </p>
                <p className="landing-com__goers">
                  <span className="landing-com__pile">
                    {DEMO.faces.slice(0, 4).map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </span>
                  <strong>
                    {crowd.count} {crowd.count === 1 ? 'exposant' : 'exposants'}
                  </strong>{' '}
                  y {crowd.count === 1 ? 'va' : 'vont'}
                </p>
                <span className="landing-com__mark">
                  <Star size={14} strokeWidth={2} /> Repérer
                </span>
              </div>
            </article>
          )}
          <p className="landing-com__day">Aujourd’hui</p>
          <div className="landing-com__feed">
            {going && (
              <div className="landing-com__item">
                <span className="landing-com__face">{DEMO.feed[0]?.initial}</span>
                <div>
                  <p>
                    <strong>{DEMO.feed[0]?.who}</strong> va à <strong>{going.name}</strong>.
                  </p>
                  <MiniEvent event={going} />
                </div>
              </div>
            )}
            {added && (
              <div className="landing-com__item">
                <span className="landing-com__face">{DEMO.feed[1]?.initial}</span>
                <div>
                  <p>
                    <strong>{DEMO.feed[1]?.who}</strong> a ajouté un festival sur Fellowship.
                  </p>
                  <MiniEvent event={added} />
                </div>
              </div>
            )}
          </div>
        </div>
        <aside className="landing-com__side">
          <div className="landing-com__box">
            <h5>Où vous vous croiserez</h5>
            {dossiers.slice(0, 3).map((d) => (
              <MiniEvent key={d.id} event={d} />
            ))}
          </div>
          <div className="landing-com__box">
            <h5>Tu connais peut-être</h5>
            {DEMO.goers.slice(5, 8).map((g) => (
              <span key={g.name} className="landing-com__follow">
                <span className="landing-com__face">{g.name.charAt(0)}</span>
                <span>
                  <strong>{g.name}</strong>
                  <small>{g.craft}</small>
                </span>
                <Plus size={14} strokeWidth={2} />
              </span>
            ))}
          </div>
        </aside>
      </div>
    </AppWindow>
  )
}
