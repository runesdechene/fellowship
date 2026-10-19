/**
 * QUOI     — l'écran Vitrine d'un artisan (/:slug) : l'en-tête, les prochaines escales, la route
 *            passée en tampons, et le pied de page avec l'adresse publique et « Signaler ce profil ».
 * POURQUOI — la page publique d'un artisan, reprise de la V1 dans le langage « 2027 ».
 * ATTENTION — l'adresse est celle de la V1 (`flw.sh/<slug>`) : la vitrine publique reste servie
 *            par la V1 jusqu'à la bascule (lot 12).
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { EscaleCard } from './EscaleCard'
import { ReportProfile } from './ReportProfile'
import { Stamps } from './Stamps'
import { useVitrine, type Vitrine } from './useVitrine'
import { VitrineEditor } from './VitrineEditor'
import { VitrineHead } from './VitrineHead'

export function VitrinePage() {
  const { slug } = useParams()
  const { user, actor, entities, reloadIdentity } = useAuth()
  const navigate = useNavigate()
  const { vitrine, loading, notFound, error, toggleFollow, reload, show } = useVitrine(
    slug,
    actor?.id,
  )
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  if (loading) return null
  if (notFound || error || !vitrine) {
    return (
      <div className="vitrine vitrine--empty">
        <p className="vitrine__message">{error ?? 'Cette vitrine n’existe pas.'}</p>
      </div>
    )
  }

  const count = vitrine.upcoming.length
  const isOwner = actor?.id === vitrine.actorId

  /**
   * Publiée : la vitrine publiée s'affiche aussitôt, puis se relit — par la nouvelle adresse si elle
   * a changé (la relecture garde la vitrine affichée, son adresse étant déjà la bonne).
   */
  function onSaved(next: Vitrine) {
    show(next)
    setEditing(false)
    setSaved(true)
    window.setTimeout(() => {
      setSaved(false)
    }, 2600)
    void reloadIdentity()
    if (vitrine && next.slug !== vitrine.slug) void navigate(`/${next.slug}`, { replace: true })
    else reload()
  }

  return (
    <div className={editing ? 'vitrine vitrine--editing' : 'vitrine'}>
      {saved && <p className="vitrine__saved">Vitrine mise à jour</p>}
      {editing && isOwner ? (
        <VitrineEditor
          vitrine={vitrine}
          onClose={() => {
            setEditing(false)
          }}
          onSaved={onSaved}
        />
      ) : (
        <VitrineHead
          vitrine={vitrine}
          isOwner={isOwner}
          signedIn={Boolean(user)}
          onEdit={() => {
            setEditing(true)
          }}
          onToggleFollow={() => {
            void toggleFollow()
          }}
        />
      )}

      <section className="vitrine-section">
        <h2 className="vitrine-section__title">
          Prochaines escales
          <span className="vitrine-section__count">
            {count} {count > 1 ? 'dates' : 'date'}
          </span>
        </h2>
        {count > 0 ? (
          <div className="escales">
            {vitrine.upcoming.map((date) => (
              <EscaleCard key={date.eventId} date={date} />
            ))}
          </div>
        ) : (
          <p className="vitrine__message">Aucune escale annoncée pour l’instant.</p>
        )}
      </section>

      <Stamps past={vitrine.past} />

      <footer className="vitrine__footer">
        Carnet de route Fellowship · {window.location.host}/{vitrine.slug}
        {/* Pas de signalement de sa propre enseigne, même sous son nom de personne, ni sans compte. */}
        {user && !entities.some((entity) => entity.actor_id === vitrine.actorId) && (
          <ReportProfile targetId={vitrine.actorId} />
        )}
      </footer>
    </div>
  )
}
