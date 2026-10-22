/**
 * QUOI     — la fiche d'une personne dans l'administration (/admin/personnes/:id) : en-tête, puis
 *            enseignes, activité et accès à gauche, informations à droite.
 * POURQUOI — maquette 2344:2. Les notes internes et les corrections viendront dans leurs blocs.
 */
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityCard } from '@/components/ui/ActivityCard'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { NotesCard } from '@/components/ui/NotesCard'
import { formatFullDate, timeAgo } from '@/lib/dates'
import { AccessCard } from './AccessCard'
import { PersonEntitiesCard } from './PersonEntitiesCard'
import { PersonInfoCard } from './PersonInfoCard'
import { ProspectOriginCard } from './ProspectOriginCard'
import { personRoleLabel } from './roles'
import { useAdminPerson } from './useAdminPerson'

// `key={id}` : passer d'une personne à l'autre remet à zéro la correction et les confirmations.
export function PersonPage() {
  const { id = '' } = useParams()
  return <PersonSheet key={id} id={id} />
}

function PersonSheet({ id }: { id: string }) {
  const { data, error, reload } = useAdminPerson(id)
  const [editing, setEditing] = useState(false)

  if (error) return <p className="admin-page__error">{error}</p>
  if (!data) return null

  const { person, entities, gestures } = data
  const lastSeen = person.last_seen_at
    ? `dernière visite ${timeAgo(new Date(person.last_seen_at), new Date())}`
    : 'aucune connexion'
  const meta = [
    person.email,
    person.handle && `@${person.handle}`,
    `inscription le ${formatFullDate(new Date(person.created_at))}`,
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
            <span className="person-role">{personRoleLabel(person.role)}</span>
            {person.suspended_at && (
              <span className="person-role person-role--suspended">Compte suspendu</span>
            )}
          </div>
          <p className="sheet__meta">{meta}</p>
        </div>
        {!editing && (
          <Button className="sheet__action" onClick={() => setEditing(true)}>
            Modifier
          </Button>
        )}
      </header>
      <div className="sheet__columns">
        <div className="sheet__column">
          <PersonEntitiesCard personId={person.actor_id} entities={entities} />
          <ActivityCard
            tiles={[
              { label: 'Visites', value: person.visits },
              { label: 'Dates suivies', value: person.dates },
              { label: 'Avis écrits', value: person.avis },
              { label: 'Questions et réponses', value: person.questions },
              { label: 'Fiches créées', value: person.fiches },
            ]}
            gestures={gestures}
          />
          <AccessCard person={person} onChanged={reload} />
        </div>
        <div className="sheet__column sheet__column--side">
          <PersonInfoCard
            person={person}
            editing={editing}
            onEdit={() => setEditing(true)}
            onDone={(saved) => {
              setEditing(false)
              if (saved) reload()
            }}
          />
          <NotesCard key={person.actor_id} actorId={person.actor_id} />
          <ProspectOriginCard key={`origine-${person.actor_id}`} userId={person.actor_id} />
        </div>
      </div>
    </div>
  )
}
