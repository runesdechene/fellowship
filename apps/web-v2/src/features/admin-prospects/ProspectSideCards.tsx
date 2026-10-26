/**
 * QUOI     — la colonne de côté de la page d'un prospect : ses informations (modifiables sur
 *            place), sa note, et le compte créé s'il y en a un.
 * POURQUOI — les mêmes cellules que le tableau (ProspectCells) : on corrige un e-mail ou une ville
 *            sans changer d'écran (maquette 2355:2).
 * ATTENTION — la note est le champ `note` du prospect, pas les notes datées des comptes
 *            (admin_notes vise un acteur ; un prospect n'en est pas un).
 */
import { ExternalLink, Info, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { Select } from '@/components/ui/Select'
import { SheetRow } from '@/components/ui/SheetRow'
import { contactLabel, normalizeEmail } from '@/lib/prospect'
import { linkOf, networkOf } from '@/lib/social'
import { CheckCell, TextCell } from './ProspectCells'
import { updateProspect, type ProspectPatch } from './prospect-writes'
import type { ProspectDetail } from './useProspect'

type Field =
  | 'brand'
  | 'activity'
  | 'activity_secondary'
  | 'city'
  | 'website'
  | 'social_primary'
  | 'social_secondary'
  | 'source'

// Comment écrire au prospect ; les modèles masculin et féminin viendront ensuite.
const GENDERS = [
  { value: null, label: 'Non renseigné' },
  { value: 'femme', label: 'Féminin' },
  { value: 'homme', label: 'Masculin' },
]

// Un réseau reconnu prend son nom (« Instagram ») à la place de son numéro.
const SOCIAL: readonly Field[] = ['social_primary', 'social_secondary']
const LINKED: readonly Field[] = ['website', ...SOCIAL]

const FIELDS: readonly { field: Field; label: string }[] = [
  { field: 'brand', label: 'Marque' },
  { field: 'activity', label: 'Activité principale' },
  { field: 'activity_secondary', label: 'Activité secondaire' },
  { field: 'city', label: 'Ville' },
  { field: 'website', label: 'Site web' },
  { field: 'social_primary', label: 'Réseau social 1' },
  { field: 'social_secondary', label: 'Réseau social 2' },
  { field: 'source', label: 'Source' },
]

interface Props {
  prospect: ProspectDetail
  /** Les balises existantes, proposées dans la note. */
  tags: readonly string[]
  onChanged: () => void
}

export function ProspectSideCards({ prospect, tags, onChanged }: Props) {
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
          <SheetRow label="Genre">
            <Select
              label="Genre"
              value={prospect.gender}
              options={GENDERS}
              onChange={(gender) => void save({ gender })}
            />
          </SheetRow>
          <SheetRow label="E-mail">
            <TextCell
              value={prospect.email}
              label="E-mail"
              normalize={normalizeEmail}
              onSave={(email) => save({ email })}
            />
          </SheetRow>
          <SheetRow label="Téléphone">
            <TextCell
              value={prospect.phone}
              label="Téléphone"
              onSave={(phone) => save({ phone })}
            />
          </SheetRow>
          {FIELDS.map(({ field, label }) => {
            const value = prospect[field]
            const href = LINKED.includes(field) ? linkOf(value) : null
            const name = (SOCIAL.includes(field) && networkOf(value)) || label
            return (
              <SheetRow key={field} label={name}>
                <TextCell value={value} label={label} onSave={(next) => save({ [field]: next })} />
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="prospect-link__open"
                    aria-label={`Ouvrir : ${name}`}
                  >
                    <ExternalLink size={14} strokeWidth={2} />
                  </a>
                )}
              </SheetRow>
            )
          })}
          <SheetRow label="Fut croisé en festival">
            <CheckCell
              checked={prospect.festival_commun}
              label="Fut croisé en festival"
              title="Il a déjà fait un festival avec Mathéo ou Uriel"
              onSave={(festival_commun) => save({ festival_commun })}
            />
          </SheetRow>
          {prospect.festival_commun && (
            <SheetRow label="Festivals">
              <TextCell
                value={prospect.festivals_croises}
                label="Festivals"
                onSave={(festivals_croises) => save({ festivals_croises })}
              />
            </SheetRow>
          )}
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
        <TextCell
          value={prospect.note}
          label="Note"
          multiline
          tags={tags}
          onSave={(note) => save({ note })}
        />
      </AdminCard>
    </>
  )
}
