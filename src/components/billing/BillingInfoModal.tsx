import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { billingFormReady, validateSiren } from '@/lib/siren'
import { BillingInfoForm, type BillingInfoState } from './BillingInfoForm'
import './BillingInfo.css'

export function BillingInfoModal({ initial, onSubmit, onCancel, submitLabel, busy }: {
  initial: BillingInfoState
  onSubmit: (v: BillingInfoState) => void
  onCancel: () => void
  submitLabel: string
  busy?: boolean
}) {
  const [value, setValue] = useState<BillingInfoState>(initial)
  const ready = billingFormReady(value)
  return (
    <div className="billing-backdrop" onClick={onCancel}>
      <div className="billing-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Informations de facturation</h2>
        <p className="billing-intro">Pour une facture conforme, indique ta raison sociale et ton SIREN.</p>
        <BillingInfoForm value={value} onChange={setValue} />
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
