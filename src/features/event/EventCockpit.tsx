import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { formatEuros } from '@/lib/money'
import type { ParticipationStatus } from '@/types/database'
import { participationState, paymentState, type StepState } from './steps'
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

/** Un montant est saisi dès qu'on a versé ou reçu quelque chose. */
const CAPTURING_STATUSES: string[] = ['acompte_verse', 'paye']

/**
 * Un cran, dessine comme une case a cocher.
 *
 * C'est la seule forme dont personne n'a a se demander ce qu'elle fait : elle
 * dit l'etat ET la commande d'un seul dessin. La barre pleine d'avant
 * ressemblait a un bouton selectionne, on ne savait pas si elle affichait ou
 * si elle commandait.
 */
function Step({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string
  state: StepState
  disabled: boolean
  onClick: () => void
}) {
  const modifier = state === 'todo' ? '' : ` cockpit__step--${state}`
  return (
    <button
      type="button"
      className={`cockpit__step${modifier}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'done'}
    >
      <span className="cockpit__box">
        {state === 'done' && <Check size={11} strokeWidth={3.25} />}
      </span>
      {label}
    </button>
  )
}

export function EventCockpit({
  status,
  paymentStatus,
  paymentOrientation,
  standAmount,
  past,
  setStatus,
  setPayment,
  setOrientation,
  setStandAmount,
  saving,
  writeError,
}: {
  status: ParticipationStatus | null
  paymentStatus: string | null
  paymentOrientation: PaymentOrientation
  /** Le prix de la place déjà posé, ou 0 s'il ne l'est pas encore. */
  standAmount: number
  past: boolean
} & EventActions) {
  const [amountOpen, setAmountOpen] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')

  const stepIndex = PARTICIPATION_STEPS.findIndex((s) => s.key === status)
  const paymentSteps = PAYMENT_STEPS[paymentOrientation]
  const paymentIndex = paymentSteps.findIndex((s) => s.key === paymentStatus)

  // Le paiement n'a de sens qu'une fois la place acquise : avant, il n'y a
  // rien à régler. Après la date, il ne se pilote plus, il se constate.
  const showPayment = status === 'inscrit' || status === 'confirme'
  const paid = paymentOrientation === 'paye'

  function openAmount() {
    setAmountDraft(standAmount > 0 ? String(standAmount) : '')
    setAmountOpen(true)
  }

  async function saveAmount() {
    // Une saisie vide vaut zéro, donc efface la ligne. Un texte qui n'est pas
    // un nombre ne doit RIEN effacer : on referme sans écrire.
    const parsed = Number.parseFloat(amountDraft.replace(',', '.'))
    if (amountDraft.trim() !== '' && Number.isNaN(parsed)) {
      setAmountOpen(false)
      return
    }
    await setStandAmount(amountDraft.trim() === '' ? 0 : parsed)
    setAmountOpen(false)
  }

  return (
    <aside className="cockpit">
      <div className="cockpit__block">
        <span className="cockpit__label">Participation</span>
        <div className="cockpit__steps">
          {PARTICIPATION_STEPS.map((step, index) => (
            <Step
              key={step.key}
              label={step.label}
              state={participationState(index, stepIndex)}
              disabled={saving || past}
              // Decocher la derniere case cochee revient au cran precedent —
              // ou retire la participation quand on decoche la premiere.
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
                  state={paymentState(index, paymentIndex)}
                  disabled={saving || past}
                  onClick={() => {
                    void setPayment(step.key)
                    // Verser un acompte ou solder appelle un montant : la
                    // question se pose tout de suite, sinon elle ne se pose
                    // jamais et le bilan reste vide.
                    if (CAPTURING_STATUSES.includes(step.key)) openAmount()
                  }}
                />
              ))}
            </div>

            {amountOpen ? (
              <div className="cockpit__amount-capture">
                <label className="cockpit__amount-label" htmlFor="cockpit-amount">
                  {paid ? 'Montant du cachet (€)' : 'Prix versé de la place (€)'}
                </label>
                <div className="cockpit__amount-row">
                  <input
                    id="cockpit-amount"
                    className="cockpit__amount-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    autoFocus
                    placeholder="Ex : 120"
                    value={amountDraft}
                    onChange={(e) => setAmountDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveAmount()
                      if (e.key === 'Escape') setAmountOpen(false)
                    }}
                  />
                  <button
                    type="button"
                    className="cockpit__amount-save"
                    onClick={() => void saveAmount()}
                    disabled={saving}
                  >
                    OK
                  </button>
                </div>
                <small className="cockpit__amount-hint">
                  Enregistré dans ton bilan, tu ne l’oublieras pas.
                </small>
              </div>
            ) : (
              standAmount > 0 && (
                <button
                  type="button"
                  className="cockpit__amount-paid"
                  onClick={openAmount}
                  disabled={past}
                >
                  <span className="cockpit__amount-paid-label">
                    {paid ? 'Cachet reçu' : 'Place réglée'}
                  </span>
                  <span className="cockpit__amount-paid-value">
                    {formatEuros(standAmount)}
                    <Pencil size={12} strokeWidth={1.9} />
                  </span>
                </button>
              )
            )}
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
