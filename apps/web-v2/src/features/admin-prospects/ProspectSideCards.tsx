/**
 * QUOI     — la colonne de côté de la page d'un prospect : ses informations (modifiables sur
 *            place), sa note, et le compte créé s'il y en a un.
 * POURQUOI — les mêmes cellules que le tableau (ProspectCells) : on corrige un e-mail ou une ville
 *            sans changer d'écran (maquette 2355:2).
 * ATTENTION — la note est le champ `note` du prospect, pas les notes datées des comptes
 *            (admin_notes vise un acteur ; un prospect n'en est pas un).
 */
import { Info, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { SheetRow } from '@/components/ui/SheetRow'
import { contactLabel, normalizeEmail } from '@/lib/prospect'
import { TextCell } from './ProspectCells'
import { updateProspect, type ProspectPatch } from './prospect-writes'
import type { ProspectDetail } from './useProspect'

type Field = 'brand' | 'activity' | 'activity_secondary' | 'city' | 'phone' | 'source'

const FIELDS: readonly { field: Field; label: string }[] = [
  { field: 'brand', label: 'Marque' },
  { field: 'activity', label: 'Activité principale' },
  { field: 'activity_secondary', label: 'Activité secondaire' },
  { field: 'city', label: 'Ville' },
  { field: 'phone', label: 'Téléphone' },
  { field: 'source', label: 'Source' },
]

interface Props {
  prospect: ProspectDetail
  onChanged: () => void
}

export function ProspectSideCards({ prospect, onChanged }: Props) {
  async function save(patch: ProspectPatch) {
    await updateProspect(prospect.id, patch)
    onChanged()
  }

  return (
    <>
      <AdminCard title="Informations" Icon={Info} tone="gris">
        <dl className="sheet-rows">
          <SheetRow label="Nom">
            <TextCell value={prospect.name} label="Nom" onSave={(name) => save({ name })} />
          </SheetRow>
          <SheetRow label="E-mail">
            <TextCell
              value={prospect.email}
              label="E-mail"
              normalize={normalizeEmail}
              onSave={(email) => save({ email })}
            />
          </SheetRow>
          {FIELDS.map(({ field, label }) => (
            <SheetRow key={field} label={label}>
              <TextCell
                value={prospect[field]}
                label={label}
                onSave={(next) => save({ [field]: next })}
              />
            </SheetRow>
          ))}
          <SheetRow label="Dernier échange">
            {contactLabel(prospect.contact_channel, prospect.contacted_on) ?? '—'}
          </SheetRow>
          {prospect.user_id && (
            <SheetRow label="Compte créé">
              <Link to={`/admin/personnes/${prospect.user_id}`} className="sheet-link">
                {prospect.user_name ?? 'Voir la fiche'}
              </Link>
            </SheetRow>
          )}
        </dl>
      </AdminCard>
      <AdminCard title="Note" Icon={NotebookPen} tone="ocre">
        <TextCell value={prospect.note} label="Note" multiline onSave={(note) => save({ note })} />
      </AdminCard>
    </>
  )
}
