/**
 * QUOI     — l'écran Vitrine d'un artisan (/:slug) : l'en-tête, les prochaines escales, la route
 *            passée en tampons, et le pied de page avec l'adresse publique.
 * POURQUOI — la page publique d'un artisan, reprise de la V1 dans le langage « 2027 ».
 * ATTENTION — l'adresse est celle de la V1 (`flw.sh/<slug>`) : la vitrine publique reste servie
 *            par la V1 jusqu'à la bascule (lot 12).
 */
import { useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { EscaleCard } from './EscaleCard'
import { Stamps } from './Stamps'
import { useVitrine } from './useVitrine'
import { VitrineHead } from './VitrineHead'

export function VitrinePage() {
  const { slug } = useParams()
  const { actor } = useAuth()
  const { vitrine, loading, notFound, error, toggleFollow } = useVitrine(slug, actor?.id)

  if (loading) return null
  if (notFound || error || !vitrine) {
    return (
      <div className="vitrine vitrine--empty">
        <p className="vitrine__message">{error ?? 'Cette vitrine n’existe pas.'}</p>
      </div>
    )
  }

  const count = vitrine.upcoming.length

  return (
    <div className="vitrine">
      <VitrineHead
        vitrine={vitrine}
        isOwner={actor?.id === vitrine.actorId}
        onToggleFollow={() => {
          void toggleFollow()
        }}
      />

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
        Carnet de route Fellowship · flw.sh/{vitrine.slug}
      </footer>
    </div>
  )
}
