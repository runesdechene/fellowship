/**
 * QUOI     — la fenêtre de la facturation d'une enseigne : raison sociale, SIREN, ou « pas de
 *            SIREN » ; l'enregistrement part en base et chez Stripe, puis l'identité se relit.
 * POURQUOI — chantier 3 (19/10/2026) : des factures conformes, au nom de l'entreprise. La fenêtre
 *            reprend celle des catégories (confirm-dialog).
 * ATTENTION — seul le propriétaire de l'enseigne peut l'enregistrer (stripe-update-billing).
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Toggle } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'
import { billingReady, validSiren, type BillingDraft } from '@/lib/billing'
import { updateBilling } from '@/lib/stripe'

interface Props {
  entityId: string
  initial: BillingDraft
  onClose: () => void
}

export function BillingDialog({ entityId, initial, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { reloadIdentity } = useAuth()
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const wrongSiren = !draft.noSiren && draft.siren.trim() !== '' && !validSiren(draft.siren)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function save() {
    setBusy(true)
    setFailed(false)
    try {
      await updateBilling(entityId, draft)
      await reloadIdentity()
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="billing-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="billing-dialog-title" className="confirm-dialog__title">
          Facturation
        </h2>
        <p className="confirm-dialog__text">Le nom et le numéro qui figurent sur tes factures.</p>
        <Field label="Raison sociale" required>
          <Input
            value={draft.legalName}
            placeholder="Atelier Sauvage (EI)"
            autoComplete="organization"
            onChange={(event) => setDraft({ ...draft, legalName: event.target.value })}
          />
        </Field>
        {!draft.noSiren && (
          <Field label="SIREN" required>
            <Input
              value={draft.siren}
              inputMode="numeric"
              placeholder="552 100 554"
              aria-invalid={wrongSiren}
              onChange={(event) => setDraft({ ...draft, siren: event.target.value })}
            />
          </Field>
        )}
        {wrongSiren && (
          <p className="confirm-dialog__problem">Un SIREN a 9 chiffres ; celui-ci ne passe pas.</p>
        )}
        <Toggle
          checked={draft.noSiren}
          title="Je n’ai pas de SIREN"
          note="Entreprise étrangère ou particulier"
          onChange={(noSiren) => setDraft({ ...draft, noSiren, siren: noSiren ? '' : draft.siren })}
        />
        {failed && (
          <p className="confirm-dialog__problem">L’enregistrement n’a pas abouti. Réessaie.</p>
        )}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="action"
            onClick={() => void save()}
            disabled={busy || !billingReady(draft)}
          >
            {busy ? 'Un instant…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
