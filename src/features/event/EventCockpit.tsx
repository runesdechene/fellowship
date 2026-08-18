import { Check } from 'lucide-react'
import type { ParticipationStatus } from '@/types/database'
import type { EventActions, PaymentOrientation, PaymentStatus } from './useEvent'

/**
 * Les crans de participation, dans l'ordre où on les franchit. « refuse » n'y
 * figure pas : ce n'est pas une étape du chemin, c'est une sortie de route, et
 * elle se pose ailleurs. « confirme » non plus — la V1 ne le proposait pas au
 * clic et rien ne l'alimente encore.
 */
const PARTICIPATION_STEPS: { key: ParticipationStatus; label: string }[] = [
  { key: 'interesse', label: 'Intéressé' },
  { key: 'en_cours', label: 'Dossier en cours' },
  { key: 'inscrit', label: 'Inscrit' },
]

/**
 * Les crans de paiement, dans les deux sens. Les mêmes états en base, lus
 * différemment selon qu'on paie sa place ou qu'on est payé pour venir.
 */
const PAYMENT_STEPS: Record<PaymentOrientation, { key: PaymentStatus; label: string }[]> = {
  payeur: [
    { key: 'a_payer', label: 'À payer' },
    { key: 'acompte_verse', label: 'Acompte versé' },
    { key: 'paye', label: 'Payé' },
  ],
  paye: [
    { key: 'a_payer', label: 'À recevoir' },
    { key: 'acompte_verse', label: 'Acompte reçu' },
    { key: 'paye', label: 'Reçu' },
  ],
}

/**
 * Un cran. Trois états : franchi (olive, acquis), courant (surface sombre,
 * c'est là qu'on en est), à venir (éteint). Cliquer un cran déjà courant le
 * décoche — c'est le seul moyen de revenir en arrière sans tout retirer.
 */
function Step({
  label,
  done,
  now,
  disabled,
  onClick,
}: {
  label: string
  done: boolean
  now: boolean
  disabled: boolean
  onClick: () => void
}) {
  const state = now ? ' cockpit__step--now' : done ? ' cockpit__step--done' : ''
  return (
    <button
      type="button"
      className={`cockpit__step${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={done || now}
    >
      <span className="cockpit__dot">
        {(done || now) && <Check size={10} strokeWidth={3} />}
      </span>
      {label}
    </button>
  )
}

export function EventCockpit({
  status,
  paymentStatus,
  paymentOrientation,
  past,
  setStatus,
  setPayment,
  setOrientation,
  saving,
  writeError,
}: {
  status: ParticipationStatus | null
  paymentStatus: string | null
  paymentOrientation: PaymentOrientation
  past: boolean
} & EventActions) {
  const stepIndex = PARTICIPATION_STEPS.findIndex((s) => s.key === status)
  const paymentSteps = PAYMENT_STEPS[paymentOrientation]
  const paymentIndex = paymentSteps.findIndex((s) => s.key === paymentStatus)

  // Le paiement n'a de sens qu'une fois la place acquise : avant, il n'y a
  // rien à régler. Après la date, il ne se pilote plus, il se constate.
  const showPayment = status === 'inscrit' || status === 'confirme'

  return (
    <aside className="cockpit">
      <div className="cockpit__block">
        <span className="cockpit__label">Participation</span>
        <div className="cockpit__steps">
          {PARTICIPATION_STEPS.map((step, index) => (
            <Step
              key={step.key}
              label={step.label}
              done={stepIndex > index}
              now={stepIndex === index}
              disabled={saving || past}
              // Recliquer le cran courant revient au précédent — ou retire la
              // participation quand on décoche le premier.
              onClick={() =>
                void setStatus(
                  stepIndex === index
                    ? (PARTICIPATION_STEPS[index - 1]?.key ?? null)
                    : step.key,
                )
              }
            />
          ))}
        </div>
        {/* Un refus n'est pas un cran du chemin : aucun n'est allumé, et sans
            ce mot le suivi aurait l'air vide alors qu'il s'est passé quelque
            chose. */}
        {status === 'refuse' && (
          <p className="cockpit__note">Dossier refusé pour cette édition.</p>
        )}
      </div>

      {showPayment && (
        <>
          <div className="cockpit__sep" />
          <div className="cockpit__block">
            <span className="cockpit__label">Paiement</span>

            {!past && (
              <div className="cockpit__orientation">
                <button
                  type="button"
                  className={
                    paymentOrientation === 'payeur'
                      ? 'cockpit__orientation-opt cockpit__orientation-opt--on'
                      : 'cockpit__orientation-opt'
                  }
                  onClick={() => void setOrientation('payeur')}
                  disabled={saving}
                >
                  Je paie ma place
                </button>
                <button
                  type="button"
                  className={
                    paymentOrientation === 'paye'
                      ? 'cockpit__orientation-opt cockpit__orientation-opt--on'
                      : 'cockpit__orientation-opt'
                  }
                  onClick={() => void setOrientation('paye')}
                  disabled={saving}
                >
                  On me paie
                </button>
              </div>
            )}

            <div className="cockpit__steps">
              {paymentSteps.map((step, index) => (
                <Step
                  key={step.key}
                  label={step.label}
                  done={paymentIndex > index}
                  now={paymentIndex === index}
                  disabled={saving || past}
                  onClick={() => void setPayment(step.key)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {status && !past && (
        <>
          <div className="cockpit__sep" />
          <button
            type="button"
            className="cockpit__quit"
            onClick={() => void setStatus(null)}
            disabled={saving}
          >
            Je ne fais pas cette date
          </button>
        </>
      )}

      {/* L'écriture a échoué et l'affichage est déjà revenu en arrière : sans
          ce mot, le cran qui saute passerait pour un bug. */}
      {writeError && <p className="cockpit__error">{writeError}</p>}
    </aside>
  )
}
