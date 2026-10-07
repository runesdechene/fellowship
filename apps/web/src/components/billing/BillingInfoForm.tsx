import { validateSiren } from '@/lib/siren'
import './BillingInfo.css'

export interface BillingInfoState { legalName: string; siren: string; noSiren: boolean }

export function BillingInfoForm({ value, onChange, showLegalName = true }: {
  value: BillingInfoState
  onChange: (v: BillingInfoState) => void
  /** Au checkout, la raison sociale est collectée par Stripe → on masque ce champ ici
   * pour éviter la double saisie. À l'édition (Abonnement), on l'affiche. */
  showLegalName?: boolean
}) {
  const sirenInvalid = !value.noSiren && value.siren.trim().length > 0 && !validateSiren(value.siren).valid
  return (
    <div className="billing-form">
      {showLegalName && (
        <label className="billing-field">
          <span>Raison sociale</span>
          <input
            type="text"
            value={value.legalName}
            onChange={e => onChange({ ...value, legalName: e.target.value })}
            placeholder="Ex. Atelier Rune de Chêne (EI)"
            autoComplete="organization"
          />
        </label>
      )}

      {!value.noSiren && (
        <label className="billing-field">
          <span>SIREN (9 chiffres)</span>
          <input
            type="text"
            inputMode="numeric"
            value={value.siren}
            onChange={e => onChange({ ...value, siren: e.target.value })}
            placeholder="552 100 554"
            aria-invalid={sirenInvalid}
          />
          {sirenInvalid && <em className="billing-error">SIREN invalide (9 chiffres, clé de contrôle).</em>}
        </label>
      )}

      <label className="billing-check">
        <input
          type="checkbox"
          checked={value.noSiren}
          onChange={e => onChange({ ...value, noSiren: e.target.checked, siren: e.target.checked ? '' : value.siren })}
        />
        <span>Je n'ai pas de SIREN (étranger / particulier)</span>
      </label>
    </div>
  )
}
