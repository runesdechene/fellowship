/**
 * QUOI     — le bloc Informations : nom, type, ville, vitrine, raison sociale, SIREN, téléphone du
 *            propriétaire ; « Corriger » (ou « Modifier » de l'en-tête) le passe en formulaire.
 * POURQUOI — l'état « en correction » vit dans la page, pour que les deux boutons l'ouvrent.
 */
import { Info } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { TypeChip } from '@/components/ui/TypeChip'
import { SheetRow } from '@/components/ui/SheetRow'
import { EntityEditForm } from './EntityEditForm'
import type { EntityFields } from './useAdminEntity'

const NONE = '—'

interface Props {
  entity: EntityFields
  ownerPhone: string | null
  editing: boolean
  onEdit: () => void
  /** `saved` : la correction est écrite, la fiche doit se relire. */
  onDone: (saved: boolean) => void
}

export function EntityInfoCard({ entity, ownerPhone, editing, onEdit, onDone }: Props) {
  const corriger = editing ? undefined : (
    <button type="button" className="sheet-link sheet-link--button" onClick={onEdit}>
      Corriger
    </button>
  )
  return (
    <AdminCard title="Informations" Icon={Info} tone="gris" action={corriger}>
      {editing ? (
        <EntityEditForm
          entity={entity}
          onCancel={() => onDone(false)}
          onSaved={() => onDone(true)}
        />
      ) : (
        <dl className="sheet-rows">
          <SheetRow label="Nom">{entity.brand_name || NONE}</SheetRow>
          <SheetRow label="Type">
            <TypeChip type={entity.type} />
            {entity.craft_type && <span className="sheet-row__aside">{entity.craft_type}</span>}
          </SheetRow>
          <SheetRow label="Ville">{entity.city || NONE}</SheetRow>
          <SheetRow label="Vitrine">
            {entity.public_slug ? `flw.sh/${entity.public_slug}` : NONE}
          </SheetRow>
          <SheetRow label="Raison sociale">{entity.legal_name || NONE}</SheetRow>
          <SheetRow label="SIREN">{entity.siren || NONE}</SheetRow>
          <SheetRow label="Téléphone">{ownerPhone || NONE}</SheetRow>
        </dl>
      )}
    </AdminCard>
  )
}
