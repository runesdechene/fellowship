/**
 * QUOI     — le tableau des enseignes : identité, offre, comptes reliés, qui paie, activité.
 * POURQUOI — chaque ligne ouvre la fiche de l'enseigne ; le lien de la première cellule est étendu
 *            à la ligne entière en CSS (admin-table__row-link).
 */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { OfferBadge } from '@/components/ui/OfferBadge'
import { TypeChip } from '@/components/ui/TypeChip'
import { entityTypeOf } from '@/lib/entity-type'
import { membersSummary, roleLabel } from '@/lib/admin-members'
import { offerOf } from '@/lib/offer'
import { activityLabel } from './activity'
import type { EntityRow, MemberRow } from './useAccounts'

const MAX_FACES = 3

interface Props {
  rows: EntityRow[]
  members: Map<string, MemberRow[]>
}

export function EntitiesTable({ rows, members }: Props) {
  const now = new Date()
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th scope="col">Enseigne</th>
          <th scope="col">Offre</th>
          <th scope="col">Comptes reliés</th>
          <th scope="col">Payée par</th>
          <th scope="col">Activité</th>
          <th scope="col">
            <span className="admin-table__sr">Ouvrir</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const offer = offerOf(row, now)
          const team = members.get(row.actor_id) ?? []
          const first = team[0]
          const gifted = offer.kind === 'pro' && row.plan !== 'pro'
          const paidBy = row.paid_by_name || (gifted ? 'Offert' : '—')
          return (
            <tr key={row.actor_id} className="admin-table__row">
              <td>
                <Link to={`/admin/enseignes/${row.actor_id}`} className="admin-table__row-link">
                  <Avatar
                    src={row.avatar_url}
                    name={row.brand_name}
                    className={`admin-table__logo admin-table__logo--${entityTypeOf(row.type).tone}`}
                  />
                  <span className="admin-table__identity">
                    <span className="admin-table__name">{row.brand_name}</span>
                    <span className="admin-table__meta">
                      <TypeChip type={row.type} />
                      {row.city}
                    </span>
                  </span>
                </Link>
              </td>
              <td>
                <OfferBadge offer={offer} />
              </td>
              <td>
                {first && (
                  <span className="admin-table__people">
                    <AvatarStack>
                      {team.slice(0, MAX_FACES).map((member) => (
                        <Avatar
                          key={member.actor_id}
                          src={member.avatar_url}
                          name={member.display_name}
                          className="admin-table__face"
                        />
                      ))}
                    </AvatarStack>
                    <span className="admin-table__identity">
                      <span className="admin-table__text">
                        {first.display_name} · {roleLabel(first.role)}
                      </span>
                      <span className="admin-table__meta">{membersSummary(team.length)}</span>
                    </span>
                  </span>
                )}
              </td>
              <td className="admin-table__text">{paidBy}</td>
              <td className="admin-table__text">{activityLabel(row.dates, row.avis)}</td>
              <td className="admin-table__end">
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
