/**
 * QUOI     — le bloc Enseignes d'une personne : chacune avec son offre, son type et le rôle qu'elle y tient.
 * POURQUOI — de la fiche d'une personne à celle de son enseigne en un clic ; sans enseigne, son
 *            arrivée n'est pas finie.
 */
import { Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { Avatar } from '@/components/ui/Avatar'
import { OfferBadge } from '@/components/ui/OfferBadge'
import { TypeChip } from '@/components/ui/TypeChip'
import { roleLabel } from '@/lib/admin-members'
import { entityTypeOf } from '@/lib/entity-type'
import { offerOf } from '@/lib/offer'
import type { PersonEntity } from './useAdminPerson'

export function PersonEntitiesCard({
  personId,
  entities,
}: {
  personId: string
  entities: PersonEntity[]
}) {
  const now = new Date()
  return (
    <AdminCard title="Enseignes" Icon={Store} tone="prune">
      {entities.length === 0 ? (
        <p className="sheet-empty">Aucune enseigne — arrivée non finie</p>
      ) : (
        <ul className="sheet-members">
          {entities.map((entity) => (
            <li key={entity.entity_id}>
              <Link to={`/admin/enseignes/${entity.entity_id}`} className="sheet-member">
                <Avatar
                  src={entity.avatar_url}
                  name={entity.brand_name}
                  className={`sheet-member__face person-entity__logo admin-table__logo--${entityTypeOf(entity.type).tone}`}
                />
                <span className="sheet-member__text">
                  <span className="sheet-member__name">{entity.brand_name}</span>
                  <span className="person-entity__meta">
                    <TypeChip type={entity.type} />
                    {entity.city && <span className="sheet-member__meta">{entity.city}</span>}
                  </span>
                </span>
                <span className="person-entity__end">
                  <OfferBadge offer={offerOf(entity, now)} />
                  <span className="sheet-member__role">
                    {roleLabel(entity.role)}
                    {entity.paid_by_user === personId && ' · paie l’abonnement'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}
