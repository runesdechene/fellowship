/**
 * QUOI     — le tableau des prospects, modifiable cellule par cellule ; en tête, la ligne d'un
 *            prospect en cours d'ajout.
 * POURQUOI — le prospectant travaille sans quitter le tableau (spec du lot 3, maquette 2343:2).
 * ATTENTION — « Compte créé » ne se coche que par « Voir et rapprocher » (qui sait à quel compte
 *            relier) ; le décocher demande confirmation à la page, qui écrit.
 */
import { Link2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EMAIL_STATUSES, normalizeEmail, type EmailStatus } from '@/lib/prospect'
import { CheckCell, ContactCell, SelectCell, TextCell } from './ProspectCells'
import { updateProspect, type ProspectPatch } from './prospect-writes'
import type { ProspectRow } from './useProspects'

const COLUMNS = [
  'Personne',
  'Activité',
  'E-mail',
  'Téléphone',
  'Source',
  'Contact',
  'Statut e-mail',
  'Compte créé',
  'Note',
  'Relance',
] as const

type TextField = 'name' | 'brand' | 'activity' | 'city' | 'phone' | 'source' | 'note'

interface Props {
  rows: ProspectRow[]
  /** Un prospect en cours d'ajout : la ligne de tête n'a que son nom. */
  adding: boolean
  onAdd: (name: string | null) => Promise<void>
  /** La ligne d'ajout quittée sans rien taper (ou par Échap) disparaît. */
  onCancelAdd: () => void
  onChanged: () => void
  onAskDelete: (row: ProspectRow) => void
  onAskUnlink: (row: ProspectRow) => void
}

function statusOf(value: string): EmailStatus {
  return EMAIL_STATUSES.find((status) => status.value === value)?.value ?? 'pas_envoye'
}

export function ProspectsTable({
  rows,
  adding,
  onAdd,
  onCancelAdd,
  onChanged,
  onAskDelete,
  onAskUnlink,
}: Props) {
  return (
    <table className="admin-table prospect-table">
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
          <th scope="col">
            <span className="admin-table__sr">Supprimer</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {adding && (
          <tr className="admin-table__row prospect-row--draft">
            <td>
              <TextCell
                value={null}
                label="Nom"
                autoOpen
                onSave={onAdd}
                onClose={(sent) => {
                  if (sent === null) onCancelAdd()
                }}
              />
            </td>
            {COLUMNS.slice(1).map((column) => (
              <td key={column} className="admin-table__text prospect-cell__empty">
                —
              </td>
            ))}
            <td />
          </tr>
        )}
        {rows.map((row) => (
          <ProspectLine
            key={row.id}
            row={row}
            onChanged={onChanged}
            onAskDelete={onAskDelete}
            onAskUnlink={onAskUnlink}
          />
        ))}
      </tbody>
    </table>
  )
}

interface LineProps {
  row: ProspectRow
  onChanged: () => void
  onAskDelete: (row: ProspectRow) => void
  onAskUnlink: (row: ProspectRow) => void
}

function ProspectLine({ row, onChanged, onAskDelete, onAskUnlink }: LineProps) {
  async function save(patch: ProspectPatch) {
    await updateProspect(row.id, patch)
    onChanged()
  }
  const text = (field: TextField) => (next: string | null) => save({ [field]: next })

  return (
    <tr className="admin-table__row">
      <td>
        <span className="admin-table__identity">
          <span className="admin-table__name">
            <TextCell value={row.name} label="Nom" onSave={text('name')} />
          </span>
          <span className="admin-table__meta">
            <TextCell value={row.brand} label="Marque" onSave={text('brand')} />
          </span>
        </span>
      </td>
      <td className="admin-table__text">
        <span className="prospect-pair">
          <TextCell value={row.activity} label="Activité" onSave={text('activity')} />
          <span aria-hidden="true">·</span>
          <TextCell value={row.city} label="Ville" onSave={text('city')} />
        </span>
      </td>
      <td className="admin-table__text">
        <TextCell
          value={row.email}
          label="E-mail"
          normalize={normalizeEmail}
          onSave={(next) => save({ email: next })}
        />
      </td>
      <td className="admin-table__text">
        <TextCell value={row.phone} label="Téléphone" onSave={text('phone')} />
      </td>
      <td className="admin-table__text">
        <TextCell value={row.source} label="Source" onSave={text('source')} />
      </td>
      <td className="admin-table__text">
        <ContactCell channel={row.contact_channel} on={row.contacted_on} onSave={save} />
      </td>
      <td>
        <SelectCell
          value={statusOf(row.email_status)}
          label="Statut de l’e-mail"
          options={EMAIL_STATUSES}
          className={(shown) =>
            `prospect-status prospect-status--${(shown ?? 'pas_envoye').replace('_', '-')}`
          }
          onSave={(next) => save({ email_status: next ?? 'pas_envoye' })}
        />
      </td>
      <td>
        <span className="prospect-account">
          <CheckCell
            checked={row.user_id !== null}
            label="Compte créé"
            disabled={row.user_id === null}
            title={row.user_id === null ? 'Se coche depuis « Voir et rapprocher »' : undefined}
            onSave={() => {
              onAskUnlink(row)
              // La case reste cochée : c'est la fenêtre de confirmation qui défait le lien.
              return Promise.reject(new Error(''))
            }}
          />
          {row.user_id && (
            <Link
              to={`/admin/personnes/${row.user_id}`}
              className="prospect-account__link"
              aria-label={`Ouvrir la fiche de ${row.user_name ?? 'la personne'}`}
            >
              <Link2 size={14} strokeWidth={2} />
            </Link>
          )}
        </span>
      </td>
      <td className="admin-table__text prospect-note">
        <TextCell value={row.note} label="Note" onSave={text('note')} />
      </td>
      <td>
        <span className="prospect-relance">
          <CheckCell
            checked={row.a_relancer}
            label="À relancer"
            onSave={(next) => save({ a_relancer: next })}
          />
          {row.a_relancer && <span className="prospect-relance__text">À relancer</span>}
        </span>
      </td>
      <td className="admin-table__end">
        <button
          type="button"
          className="prospect-row__delete"
          aria-label="Supprimer ce prospect"
          onClick={() => onAskDelete(row)}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  )
}
