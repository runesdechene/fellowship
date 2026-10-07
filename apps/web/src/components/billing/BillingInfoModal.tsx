import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { billingFormReady, validateSiren } from '@/lib/siren'
import { BillingInfoForm, type BillingInfoState } from './BillingInfoForm'
import './BillingInfo.css'

export function BillingInfoModal({ initial, onSubmit, onCancel, submitLabel, busy, showLegalName = true }: {
  initial: BillingInfoState
  onSubmit: (v: BillingInfoState) => void
  onCancel: () => void
  submitLabel: string
  busy?: boolean
  /** false au checkout (raison sociale collectée par Stripe) ; true à l'édition Abonnement. */
  showLegalName?: boolean
}) {
  const [value, setValue] = useState<BillingInfoState>(initial)
  const ready = billingFormReady(value, { requireLegalName: showLegalName })
  return (
    <div className="billing-backdrop" onClick={onCancel}>
      <div className="billing-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Informations de facturation</h2>
        <p className="billing-intro">
          {showLegalName
            ? 'Pour une facture conforme, indique ta raison sociale et ton SIREN.'
            : 'Indique ton SIREN pour une facture conforme. Ta raison sociale te sera demandée à l’étape de paiement.'}
        </p>
        <BillingInfoForm value={value} onChange={setValue} showLegalName={showLegalName} />
        {!showLegalName && (
          <p className="billing-hint">
            En franchise en base de TVA ? À l'étape de paiement, ne coche pas « J'achète en tant qu'entreprise » :
            ton SIREN suffit, le n° de TVA ne te concerne pas.
          </p>
        )}
        <div className="billing-actions">
          <button className="billing-cancel" onClick={onCancel} disabled={busy}>Annuler</button>
          <button
            className="billing-submit"
            disabled={!ready || busy}
            onClick={() => onSubmit({ ...value, siren: value.noSiren ? '' : validateSiren(value.siren).normalized })}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}{submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
