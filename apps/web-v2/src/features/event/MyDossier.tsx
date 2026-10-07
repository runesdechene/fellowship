/**
 * QUOI     — « Mon dossier — visible par toi seul » : où en est l'argent d'une date (à payer,
 *            acompte versé, payé), le montant, l'acompte, l'échéance du solde.
 * POURQUOI — la fonction plébiscitée : savoir ce qui est réglé et ce qui reste, sans tenir un
 *            tableur à côté (maquette 2027, fiche événement).
 * ATTENTION — le montant de la place est la ligne « stepper » du registre (set_stand_amount) ;
 *            l'acompte et l'échéance vivent dans participation_dossiers. Un cachet se lit à
 *            l'envers : à recevoir, acompte reçu, reçu.
 */
import { Check, CircleDollarSign, Clock, Coins, Hourglass } from 'lucide-react'
import type { CSSProperties } from 'react'
import { DraftInput } from '@/components/ui/DraftInput'
import { InfoRow, InfoRows } from '@/components/ui/InfoRows'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import { balanceOf } from '@/lib/dossiers'
import { formatEuros, parseAmount } from '@/lib/money'
import type { DossierFields } from './useDossier'
import type { PaymentOrientation, PaymentStatus } from './useEvent'

const STEPS: Record<PaymentOrientation, SegmentedOption<PaymentStatus>[]> = {
  payeur: [
    { value: 'a_payer', label: 'À payer', Icon: Hourglass },
    { value: 'acompte_verse', label: 'Acompte versé', Icon: Coins },
    { value: 'paye', label: 'Payé', Icon: Check },
  ],
  paye: [
    { value: 'a_payer', label: 'À recevoir', Icon: Hourglass },
    { value: 'acompte_verse', label: 'Acompte reçu', Icon: Coins },
    { value: 'paye', label: 'Reçu', Icon: Check },
  ],
}

interface MyDossierProps {
  paymentStatus: string | null
  orientation: PaymentOrientation
  standAmount: number
  saving: boolean
  setPayment: (next: PaymentStatus) => Promise<void>
  setOrientation: (next: PaymentOrientation) => Promise<void>
  setStandAmount: (amount: number) => Promise<void>
  fields: DossierFields
  save: (patch: Partial<DossierFields>) => Promise<void>
  error: string | null
}

/** Un montant vide efface ; un texte qui n'est pas un montant ne touche à rien. */
function amountOrSkip(draft: string): number | null | undefined {
  const amount = parseAmount(draft)
  return amount === 'invalide' ? undefined : amount
}

export function MyDossier({
  paymentStatus,
  orientation,
  standAmount,
  saving,
  setPayment,
  setOrientation,
  setStandAmount,
  fields,
  save,
  error,
}: MyDossierProps) {
  const status = (paymentStatus ?? 'a_payer') as PaymentStatus
  const receives = orientation === 'paye'
  const balance = balanceOf(standAmount, fields.depositAmount, status)
  const verb = receives ? 'reçus' : 'versés'

  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">
        Mon dossier <span className="event-page__block-hint">visible par toi seul</span>
      </h2>

      <Segmented
        label={receives ? 'Où en est le cachet' : 'Où en est le règlement'}
        options={STEPS[orientation]}
        value={status}
        disabled={saving}
        onChange={(next) => void setPayment(next)}
      />

      <div className="event-status__sides">
        <button
          type="button"
          className="event-status__side"
          aria-pressed={!receives}
          onClick={() => void setOrientation('payeur')}
        >
          Je paie ma place
        </button>
        <button
          type="button"
          className="event-status__side"
          aria-pressed={receives}
          onClick={() => void setOrientation('paye')}
        >
          On me paie un cachet
        </button>
      </div>

      <div className="dossier-card">
        {balance && (
          <div className="dossier-card__summary">
            <div className="dossier-card__line">
              <b>
                {formatEuros(balance.paid)} {verb} sur {formatEuros(standAmount)}
              </b>
              {balance.rest > 0 && <span>Reste {formatEuros(balance.rest)}</span>}
            </div>
            <span
              className="dossier-card__gauge"
              style={{ '--gauge': String(balance.ratio) } as CSSProperties}
            />
          </div>
        )}

        <InfoRows>
          <InfoRow Icon={CircleDollarSign} label={receives ? 'Cachet' : 'Prix de la place'}>
            <DraftInput
              label={receives ? 'Montant du cachet en euros' : 'Prix de la place en euros'}
              inputMode="decimal"
              placeholder="À renseigner"
              value={standAmount > 0 ? formatEuros(standAmount) : ''}
              onSave={(draft) => {
                const amount = amountOrSkip(draft)
                if (amount !== undefined) void setStandAmount(amount ?? 0)
              }}
            />
          </InfoRow>

          {status === 'acompte_verse' && (
            <InfoRow Icon={Coins} label={receives ? 'Acompte reçu' : 'Acompte'}>
              <DraftInput
                label="Montant de l’acompte en euros"
                inputMode="decimal"
                placeholder="Combien ?"
                value={fields.depositAmount === null ? '' : formatEuros(fields.depositAmount)}
                onSave={(draft) => {
                  const amount = amountOrSkip(draft)
                  if (amount !== undefined) void save({ depositAmount: amount })
                }}
              />
            </InfoRow>
          )}

          {status !== 'paye' && (
            <InfoRow
              Icon={Clock}
              label={receives ? 'Paiement attendu le' : 'Solde à régler avant le'}
            >
              <DraftInput
                type="date"
                label="Échéance du solde"
                value={fields.balanceDueOn ?? ''}
                onSave={(draft) => void save({ balanceDueOn: draft === '' ? null : draft })}
              />
            </InfoRow>
          )}
        </InfoRows>
      </div>

      {error && <p className="event-status__error">{error}</p>}
    </section>
  )
}
