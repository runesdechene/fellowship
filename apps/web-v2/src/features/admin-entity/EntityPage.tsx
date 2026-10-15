/**
 * QUOI     — la fiche d'une enseigne dans l'administration (/admin/enseignes/:id) : en-tête, puis
 *            abonnement et activité à gauche, comptes reliés et informations à droite.
 * POURQUOI — maquette 2342:2. Les paiements, les notes et les actions viendront dans leurs blocs.
 */
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ProBadge } from '@/components/ui/ProBadge'
import { TypeChip } from '@/components/ui/TypeChip'
import { formatFullDate } from '@/lib/dates'
import { entityTypeOf } from '@/lib/entity-type'
import { offerOf } from '@/lib/offer'
import { ActivityCard } from './ActivityCard'
import { EntityInfoCard } from './EntityInfoCard'
import { MembersCard } from './MembersCard'
import { SubscriptionCard } from './SubscriptionCard'
import { useAdminEntity } from './useAdminEntity'

export function EntityPage() {
  const { id = '' } = useParams()
  const { data, error } = useAdminEntity(id)

  if (error) return <p className="admin-page__error">{error}</p>
  if (!data) return null

  const { entity, members, gestures } = data
  const owner = members.find((member) => member.role === 'owner')
  const isPro = offerOf(entity, new Date()).kind === 'pro'
  const place = [entity.city, `créée le ${formatFullDate(new Date(entity.created_at))}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="sheet">
      <Link to="/admin/comptes" className="sheet__back">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Comptes
      </Link>
      <header className="sheet__head">
        <Avatar
          src={entity.avatar_url}
          name={entity.brand_name}
          className={`sheet__logo admin-table__logo--${entityTypeOf(entity.type).tone}`}
        />
        <div className="sheet__identity">
          <div className="sheet__name-line">
            <h1 className="sheet__name">{entity.brand_name}</h1>
            {isPro && <ProBadge />}
            <TypeChip type={entity.type} />
          </div>
          <p className="sheet__meta">{place}</p>
          {entity.public_slug && (
            <a
              className="sheet-link"
              href={`/${entity.public_slug}`}
              target="_blank"
              rel="noreferrer"
            >
              flw.sh/{entity.public_slug}
            </a>
          )}
        </div>
        {entity.public_slug && (
          <a
            className="button sheet__action"
            href={`/${entity.public_slug}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
            Voir la vitrine
          </a>
        )}
      </header>
      <div className="sheet__columns">
        <div className="sheet__column">
          <SubscriptionCard entity={entity} ownerId={owner?.actor_id ?? null} />
          <ActivityCard entity={entity} gestures={gestures} />
        </div>
        <div className="sheet__column sheet__column--side">
          <MembersCard members={members} paidBy={entity.paid_by_user} />
          <EntityInfoCard entity={entity} phone={owner?.phone ?? null} />
        </div>
      </div>
    </div>
  )
}
