/**
 * QUOI     — le bloc Informations, en lecture : nom, type, ville, vitrine, raison sociale, SIREN,
 *            téléphone du propriétaire.
 * POURQUOI — la correction de ces champs viendra s'y poser ; pour l'instant on lit.
 */
import { Info } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { TypeChip } from '@/components/ui/TypeChip'
import { SheetRow } from './SheetRow'
import type { EntityFields } from './useAdminEntity'

const NONE = '—'

export function EntityInfoCard({ entity, phone }: { entity: EntityFields; phone: string | null }) {
  return (
    <AdminCard title="Informations" Icon={Info} tone="gris">
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
        <SheetRow label="Téléphone">{phone || NONE}</SheetRow>
      </dl>
    </AdminCard>
  )
}
