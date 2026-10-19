/**
 * QUOI     — la page Nouveautés : la dernière mise à jour dépliée, les précédentes repliées sur leur
 *            titre, chacune avec ses cœurs et sa conversation.
 * POURQUOI — maquettes 2371:65 et 2371:707 ; « les anciennes repliées en dessous, juste le titre »
 *            (Uriel, 19/10/2026). Le repli est celui du navigateur (<details>).
 */
import { useAuth } from '@/lib/auth'
import { signingEntity } from '@/lib/app-updates'
import { formatDayMonthShort } from '@/lib/dates'
import { UpdateCard } from './UpdateCard'
import { UpdateConversation } from './UpdateConversation'
import { useUpdates, type AppUpdate } from './useUpdates'

export function UpdatesPage() {
  const { person, actor, entities } = useAuth()
  const personId = person?.actor_id
  const { updates, profiles, error, busy, problem, toggleHeart, comment, remove } =
    useUpdates(personId)
  const entityId = actor ? signingEntity(actor, entities) : null

  function card(update: AppUpdate) {
    return (
      <UpdateCard note={update}>
        <UpdateConversation
          update={update}
          profiles={profiles}
          personId={personId}
          isAdmin={person?.role === 'admin'}
          busy={busy}
          problem={problem}
          onHeart={(on) => void toggleHeart(update.id, on)}
          onComment={(body, parentId) => void comment(update.id, body, parentId, entityId)}
          onRemove={(commentId) => void remove(commentId)}
        />
      </UpdateCard>
    )
  }

  const [latest, ...older] = updates ?? []

  return (
    <div className="updates">
      <header className="updates__header">
        <h1 className="updates__title">Nouveautés</h1>
        <p className="updates__lead">
          Ce qui change dans Fellowship, version après version. Dis-nous ce que tu en penses.
        </p>
      </header>

      {error && <p className="updates__note">Les nouveautés n’ont pas pu être chargées.</p>}
      {updates?.length === 0 && <p className="updates__note">Aucune nouveauté pour l’instant.</p>}

      {latest && card(latest)}

      {older.map((update) => (
        <details key={update.id} className="updates__older">
          <summary className="updates__summary">
            <span className="updates__summary-title">{update.title}</span>
            <span className="updates__summary-meta">
              {update.version} · {formatDayMonthShort(new Date(update.publishedAt))}
            </span>
          </summary>
          {card(update)}
        </details>
      ))}
    </div>
  )
}
