/**
 * QUOI     — l'assistant parti à la chasse : ses critères, et les trois derniers festivals ajoutés
 *            sur Fellowship, avec leur vraie ancienneté.
 * POURQUOI — maquette 2290:2 (nœud 2309:5) : Fellowship fait la veille des festivals, fonction Pro
 *            à venir. La maquette disait « depuis le site de la mairie » : la base ne connaît pas la
 *            source, on écrit donc la vraie ancienneté (spec du lot 11c).
 * ATTENTION — les critères sont de démonstration ; les festivals sont réels. Sans affiche, la
 *            vignette prend la couleur et l'icône de sa catégorie, comme dans l'app (Poster).
 */
import { Poster } from '@/components/ui/Poster'
import { formatDateRange } from '@/lib/dates'
import { posterThumb, type Showcase } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { AppWindow } from './AppWindow'

function addedAgo(days: number): string {
  if (days === 0) return 'Ajouté sur Fellowship aujourd’hui'
  if (days === 1) return 'Ajouté sur Fellowship hier'
  return `Ajouté sur Fellowship il y a ${String(days)} jours`
}

export function HuntScreen({ recent }: { recent: Showcase['recent'] }) {
  return (
    <AppWindow
      title="Ton assistant"
      width={576}
      height={480}
      scale={0.9}
      className="landing-shot--hunt"
    >
      <div className="landing-hunt">
        <p className="landing-hunt__title">
          <i aria-hidden />
          Parti à la chasse… {recent.length}{' '}
          {recent.length === 1 ? 'nouvelle date' : 'nouvelles dates'} pour toi
        </p>
        <div className="landing-hunt__criteria">
          {DEMO.criteria.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {recent.map((e) => (
          <div key={e.id} className="landing-hunt__row">
            <Poster
              imageUrl={e.imageUrl ? posterThumb(e.imageUrl, 120) : null}
              tags={e.tags}
              className="landing-hunt__thumb"
            />
            <span>
              <strong>{e.name}</strong>
              <small>
                {formatDateRange(e.startDate, e.endDate)} · {e.place}
              </small>
              <small className="landing-hunt__source">{addedAgo(e.daysAgo)}</small>
            </span>
            <span className="landing-hunt__add">Ajouter</span>
          </div>
        ))}
        <div className="landing-hunt__row landing-hunt__row--ghost" aria-hidden>
          <i />
          <span>
            <b />
            <b />
          </span>
        </div>
      </div>
    </AppWindow>
  )
}
