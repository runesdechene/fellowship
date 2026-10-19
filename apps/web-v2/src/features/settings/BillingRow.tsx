/**
 * QUOI     — la ligne « Facturation » sous une enseigne abonnée des Réglages : à quel nom partent ses
 *            factures, et « Modifier » qui ouvre la fenêtre.
 * POURQUOI — chantier 3 (19/10/2026) : la V2 se suffit pour l'abonnement. Composée comme « Siège
 *            social ou atelier », sans maquette (choix d'Uriel : des briques existantes).
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { billingNote } from '@/lib/billing'
import { BillingDialog } from './BillingDialog'
import { SettingRow } from './SettingRow'

interface Props {
  entityId: string
  brandName: string
  billing: { legal_name: string | null; siren: string | null; billing_no_siren: boolean | null }
}

export function BillingRow({ entityId, brandName, billing }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <SettingRow title="Facturation" note={billingNote(billing)}>
      <Button
        onClick={() => {
          setEditing(true)
        }}
      >
        Modifier
      </Button>
      {editing && (
        <BillingDialog
          entityId={entityId}
          initial={{
            legalName: billing.legal_name ?? brandName,
            siren: billing.siren ?? '',
            noSiren: billing.billing_no_siren === true,
          }}
          onClose={() => {
            setEditing(false)
          }}
        />
      )}
    </SettingRow>
  )
}
