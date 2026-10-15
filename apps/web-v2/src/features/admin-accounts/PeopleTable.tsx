/**
 * QUOI     — le tableau des personnes : compte, enseigne, offre, inscription, dernière visite, activité.
 * POURQUOI — chaque ligne ouvre la fiche de la personne (maquette 2340:2).
 */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { OfferBadge } from '@/components/ui/OfferBadge'
import { TypeChip } from '@/components/ui/TypeChip'
import { formatDayMonthShort, formatFullDate, timeAgo } from '@/lib/dates'
import { offerOf } from '@/lib/offer'
import { activityLabel } from './activity'
import type { PersonRow } from './useAccounts'

export function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const now = new Date()
  const signedUp = (value: string) => {
    const date = new Date(value)
    return date.getFullYear() === now.getFullYear()
      ? formatDayMonthShort(date)
      : formatFullDate(date)
  }
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th scope="col">Compte</th>
          <th scope="col">Enseigne</th>
          <th scope="col">Offre</th>
          <th scope="col">Inscription</th>
          <th scope="col">Dernière visite</th>
          <th scope="col">Activité</th>
          <th scope="col">
            <span className="admin-table__sr">Ouvrir</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.actor_id} className="admin-table__row">
            <td>
              <Link to={`/admin/personnes/${row.actor_id}`} className="admin-table__row-link">
                <Avatar
                  src={row.avatar_url}
                  name={row.display_name}
                  className="admin-table__face"
                />
                <span className="admin-table__identity">
                  <span className="admin-table__name">{row.display_name || 'Sans prénom'}</span>
                  <span className="admin-table__meta">{row.email}</span>
                </span>
                {row.suspended_at && <span className="admin-table__flag">Compte suspendu</span>}
              </Link>
            </td>
            <td>
              <span className="admin-table__identity">
                <span className="admin-table__text">{row.entity_id ? row.brand_name : '—'}</span>
                <TypeChip type={row.entity_id ? row.entity_type : null} />
              </span>
            </td>
            <td>
              {row.entity_id ? (
                <OfferBadge offer={offerOf(row, now)} />
              ) : (
                <span className="admin-table__text">Gratuit</span>
              )}
            </td>
            <td className="admin-table__text">{signedUp(row.created_at)}</td>
            <td className="admin-table__text">
              {row.last_sign_in_at
                ? timeAgo(new Date(row.last_sign_in_at), now)
                : 'aucune connexion'}
            </td>
            <td className="admin-table__text">{activityLabel(row.dates, row.avis)}</td>
            <td className="admin-table__end">
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
