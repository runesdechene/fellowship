/**
 * QUOI     — la fiche d'une personne dans l'administration (/admin/personnes/:id) : en-tête, puis
 *            enseignes, activité et accès à gauche, informations à droite.
 * POURQUOI — maquette 2344:2. Les notes internes et les corrections viendront dans leurs blocs.
 */
import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { formatFullDate, timeAgo } from '@/lib/dates'
import { AccessCard } from './AccessCard'
import { PersonActivityCard } from './PersonActivityCard'
import { PersonEntitiesCard } from './PersonEntitiesCard'
import { PersonInfoCard } from './PersonInfoCard'
import { useAdminPerson } from './useAdminPerson'

const ROLE_NAMES: Record<string, string> = { user: 'Utilisateur', v2: 'V2', admin: 'Admin' }

export function PersonPage() {
  const { id = '' } = useParams()
  const { data, error } = useAdminPerson(id)

  if (error) return <p className="admin-page__error">{error}</p>
  if (!data) return null

  const { person, entities, gestures } = data
  const lastSeen = person.last_sign_in_at
    ? `dernière venue ${timeAgo(new Date(person.last_sign_in_at), new Date())}`
    : 'jamais venue'
  const meta = [
    person.email,
    person.handle && `@${person.handle}`,
    `inscrit le ${formatFullDate(new Date(person.created_at))}`,
    lastSeen,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="sheet">
      <Link to="/admin/comptes" className="sheet__back">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Comptes
      </Link>
      <header className="sheet__head">
        <Avatar src={person.avatar_url} name={person.display_name} className="sheet__logo" />
        <div className="sheet__identity">
          <div className="sheet__name-line">
            <h1 className="sheet__name">{person.display_name || 'Sans prénom'}</h1>
            <span className="person-role">{ROLE_NAMES[person.role] ?? person.role}</span>
            {person.suspended_at && (
              <span className="person-role person-role--suspended">Suspendu</span>
            )}
          </div>
          <p className="sheet__meta">{meta}</p>
        </div>
      </header>
      <div className="sheet__columns">
        <div className="sheet__column">
          <PersonEntitiesCard personId={person.actor_id} entities={entities} />
          <PersonActivityCard person={person} gestures={gestures} />
          <AccessCard person={person} />
        </div>
        <div className="sheet__column sheet__column--side">
          <PersonInfoCard person={person} />
        </div>
      </div>
    </div>
  )
}
