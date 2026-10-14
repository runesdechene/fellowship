/**
 * QUOI     — la fenêtre « Qui y va » de la fiche, posée sur l'écran Communauté : les compagnons de
 *            l'exposant de démonstration sur le festival à venir le plus suivi.
 * POURQUOI — maquette 2290:2 (nœud 2291:2), reproduite d'après la fenêtre de la fiche de l'app.
 * ATTENTION — les noms sont de démonstration (lib/landing-demo.ts) ; le festival et le nombre
 *            d'inscrits sont réels.
 */
import { X } from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import type { ShowEvent } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { DemoStatus } from './DemoStatus'

export function WhoGoesScreen({ event, count }: { event: ShowEvent; count: number }) {
  const goers = DEMO.goers.slice(0, Math.max(1, Math.min(count, DEMO.goers.length)))
  return (
    <div className="landing-who" aria-hidden>
      <header>
        <div>
          <strong>
            {count} {count === 1 ? 'exposant y va' : 'exposants y vont'}
          </strong>
          <small>
            {event.name} · {formatDateRange(event.startDate, event.endDate)}
          </small>
        </div>
        <span className="landing-who__close">
          <X size={14} strokeWidth={2} />
        </span>
      </header>
      {goers.map((g) => (
        <div key={g.name} className="landing-who__row">
          <span className="landing-com__face">{g.name.charAt(0)}</span>
          <span>
            <strong>{g.name}</strong>
            <small>{g.craft}</small>
          </span>
          <DemoStatus status={g.status} />
        </div>
      ))}
    </div>
  )
}
