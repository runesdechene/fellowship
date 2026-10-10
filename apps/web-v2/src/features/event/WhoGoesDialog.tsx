/**
 * QUOI     — la popup « Qui y va » : tous les amis programmés sur la date, avec leur métier et leur
 *            statut (Inscrit en vert, Dossier envoyé), sur un voile.
 * POURQUOI — maquette 2218:2 (variante sauge), Uriel, 11/10/2026 : la fiche ne nomme que trois
 *            amis, la popup dit qui sont les autres. La ville n'y figure pas (Uriel).
 * ATTENTION — l'élément <dialog> du navigateur fait le voile, Échap et le piège du focus. La popup
 *            a son adresse (`?voir=amis`, EventPage) : le retour la ferme sans quitter la fiche.
 */
import { Check, Clock, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import type { Friend } from '@/lib/friends'
import { goerStatus } from '@/lib/who-goes'
import { useWhoGoes } from './useWhoGoes'

interface WhoGoesDialogProps {
  open: boolean
  eventId: string
  /** « Les Aventuriales · 25–27 sept. » */
  subtitle: string
  friends: Friend[]
  onClose: () => void
}

export function WhoGoesDialog({ open, eventId, subtitle, friends, onClose }: WhoGoesDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { goers, error } = useWhoGoes(eventId, friends, open)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const count = friends.length
  return (
    <dialog
      ref={dialog}
      className="who-goes"
      aria-labelledby="who-goes-title"
      onClose={() => {
        // Échap ferme le <dialog> lui-même : on le dit à la fiche. Une fermeture venue de la fiche
        // (open passé à faux) ne se renvoie pas.
        if (open) onClose()
      }}
      onClick={(event) => {
        // Un clic sur le voile (le <dialog> lui-même, hors de sa carte) ferme la popup.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="who-goes__card">
        <header className="who-goes__head">
          <div>
            <h2 id="who-goes-title" className="who-goes__title">
              {count} {count === 1 ? 'ami y va' : 'amis y vont'}
            </h2>
            <p className="who-goes__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="who-goes__close" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {error ? (
          <p className="who-goes__note">La liste n’a pas pu être chargée.</p>
        ) : (
          <ul className="who-goes__list">
            {(goers ?? []).map((goer) => {
              const status = goerStatus(goer.status)
              const body = (
                <>
                  <Avatar className="who-goes__avatar" src={goer.avatarUrl} name={goer.name} />
                  <span className="who-goes__body">
                    <span className="who-goes__name">{goer.name}</span>
                    {goer.craft && <span className="who-goes__craft">{goer.craft}</span>}
                  </span>
                  {status && (
                    <span
                      className={
                        status.validated
                          ? 'who-goes__status who-goes__status--validated'
                          : 'who-goes__status'
                      }
                    >
                      {status.validated ? (
                        <Check size={12} strokeWidth={2.4} />
                      ) : (
                        <Clock size={12} strokeWidth={2.2} />
                      )}
                      {status.label}
                    </span>
                  )}
                </>
              )
              return (
                <li key={goer.id}>
                  {goer.slug ? (
                    <Link className="who-goes__row" to={`/${goer.slug}`}>
                      {body}
                    </Link>
                  ) : (
                    <span className="who-goes__row">{body}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </dialog>
  )
}
