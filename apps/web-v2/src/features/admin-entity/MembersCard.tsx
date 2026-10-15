/**
 * QUOI     — le bloc Comptes reliés : chaque membre, son rôle, et celui qui paie l'abonnement.
 * POURQUOI — de la fiche d'une enseigne à celle d'une personne en un clic.
 */
import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { Avatar } from '@/components/ui/Avatar'
import { roleLabel } from '@/lib/admin-members'
import type { MemberRow } from './useAdminEntity'

interface Props {
  members: MemberRow[]
  paidBy: string | null
}

export function MembersCard({ members, paidBy }: Props) {
  return (
    <AdminCard title="Comptes reliés" Icon={Users} tone="prune">
      {members.length === 0 ? (
        <p className="sheet-empty">Aucun compte relié</p>
      ) : (
        <ul className="sheet-members">
          {members.map((member) => (
            <li key={member.actor_id}>
              <Link to={`/admin/personnes/${member.actor_id}`} className="sheet-member">
                <Avatar
                  src={member.avatar_url}
                  name={member.display_name}
                  className="sheet-member__face"
                />
                <span className="sheet-member__text">
                  <span className="sheet-member__name">{member.display_name}</span>
                  <span className="sheet-member__meta">{member.email}</span>
                </span>
                <span className="sheet-member__role">
                  {roleLabel(member.role)}
                  {member.actor_id === paidBy && ' · paie l’abonnement'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}
