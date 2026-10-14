/**
 * QUOI     — l'inscription en un clic : un vrai festival à venir, « Ton dossier est prêt », trois
 *            coches et « S'inscrire en un clic ».
 * POURQUOI — maquette 2290:2 (nœud 2312:8) : le cas où l'organisateur gère son festival sur
 *            Fellowship. Fonction à venir (sceau « Bientôt · Pro » de la bande).
 * ATTENTION — rien n'est cliquable : c'est une promesse, dessinée sur un vrai festival.
 */
import { Check } from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import { posterThumb, type ShowEvent } from '@/lib/landing'

const READY = ['Enseigne et SIRET', 'Stand 3 × 3 m, électricité', 'Attestation d’assurance']

export function OneClickCard({ event }: { event: ShowEvent }) {
  return (
    <figure className="landing-oneclick">
      <figcaption className="landing-caption">Le festival est sur Fellowship</figcaption>
      <div className="landing-oneclick__card">
        {event.imageUrl && <img src={posterThumb(event.imageUrl, 640)} alt="" />}
        <div className="landing-oneclick__body">
          <strong>{event.name}</strong>
          <small>
            {formatDateRange(event.startDate, event.endDate)} · {event.place}
          </small>
          <span className="landing-oneclick__ready">Ton dossier est prêt</span>
          {READY.map((line) => (
            <span key={line} className="landing-oneclick__check">
              <Check size={15} strokeWidth={2.2} aria-hidden />
              {line}
            </span>
          ))}
        </div>
        <span className="landing-oneclick__button">S’inscrire en un clic</span>
      </div>
    </figure>
  )
}
