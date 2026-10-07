/**
 * QUOI     — le bloc « Mes dossiers » : une ligne par date à venir, avec où en est le dossier et
 *            où en est l'argent (à payer, acompte, payé ; ou, pour un cachet, à recevoir, reçu).
 * POURQUOI — la fonction plébiscitée par les exposants : savoir d'un coup d'œil ce qui reste à
 *            envoyer, à payer ou à recevoir.
 * ATTENTION — l'état se lit par la FORME de l'icône ; seul ce qui est acquis porte la terre.
 */
import { ChevronRight, Circle, Contrast } from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import type { PaymentTone } from '@/lib/dossiers'
import { useTransitionNavigate } from '@/lib/navigation'
import type { Dossier } from './useDashboard'

function PaymentIcon({ tone }: { tone: PaymentTone }) {
  if (tone === 'done') return <span className="dossiers__dot dossiers__dot--acquired" />
  if (tone === 'partial') return <Contrast className="dossiers__icon" size={12} strokeWidth={2.2} />
  return <Circle className="dossiers__icon" size={12} strokeWidth={2.2} />
}

export function DossiersSection({ dossiers }: { dossiers: Dossier[] }) {
  const go = useTransitionNavigate()

  return (
    <div className="dossiers">
      <div className="dossiers__head" aria-hidden="true">
        <span>Date</span>
        <span>Dossier</span>
        <span>Paiement</span>
      </div>
      <ul className="dossiers__list">
        {dossiers.map((dossier) => (
          <li key={dossier.participationId}>
            <button
              type="button"
              className="dossiers__row"
              onClick={() => go(`/evenement/${dossier.eventId}`)}
            >
              <span className="dossiers__date">
                {dossier.imageUrl ? (
                  <img className="dossiers__thumb" src={dossier.imageUrl} alt="" />
                ) : (
                  <span className="dossiers__thumb" />
                )}
                <span className="dossiers__identity">
                  <span className="dossiers__name">{dossier.name}</span>
                  <span className="dossiers__range">
                    {formatDateRange(dossier.startDate, dossier.endDate)}
                  </span>
                </span>
              </span>

              <span className="dossiers__state">
                {dossier.view.dossier.acquired ? (
                  <span className="dossiers__dot dossiers__dot--acquired" />
                ) : (
                  <Contrast className="dossiers__icon" size={12} strokeWidth={2.2} />
                )}
                {dossier.view.dossier.label}
              </span>

              <span className="dossiers__payment">
                <span className="dossiers__state">
                  <PaymentIcon tone={dossier.view.payment.tone} />
                  {dossier.view.payment.label}
                </span>
                {dossier.view.payment.detail && (
                  <span className="dossiers__detail">{dossier.view.payment.detail}</span>
                )}
              </span>

              <ChevronRight className="dossiers__chevron" size={16} strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
