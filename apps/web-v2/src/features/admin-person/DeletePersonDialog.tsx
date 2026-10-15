/**
 * QUOI     — la fenêtre « Supprimer le compte » de la fiche d'une personne : l'aperçu de ce qui part
 *            et de ce qui reste, puis un champ où retaper son prénom (ou son e-mail) avant de supprimer.
 * POURQUOI — l'aperçu et l'exécution suivent le même plan côté serveur (delete-account, avec
 *            `userId` pour un admin). Retaper le nom évite de supprimer la mauvaise fiche.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus ; pendant la
 *            suppression, ni Échap ni le voile ne la ferment.
 */
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { deleteAccount, previewDeletion, type DeletionPreview } from '@/lib/admin-functions'
import { keptNote } from '@/lib/settings'
import type { PersonFields } from './useAdminPerson'

interface Props {
  person: PersonFields
  onClose: () => void
  onDeleted: () => void
}

export function DeletePersonDialog({ person, onClose, onDeleted }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const expected = person.display_name || person.email

  useEffect(() => {
    dialog.current?.showModal()
    previewDeletion(person.actor_id)
      .then(setPreview)
      .catch((failure: unknown) =>
        setError(failure instanceof Error ? failure.message : 'L’aperçu n’a pas pu être chargé.'),
      )
  }, [person.actor_id])

  function close() {
    if (!deleting) onClose()
  }

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await deleteAccount(person.actor_id)
      onDeleted()
    } catch (failure) {
      setDeleting(false)
      setError(failure instanceof Error ? failure.message : 'La suppression n’a pas abouti.')
    }
  }

  return (
    <dialog
      ref={dialog}
      className="delete-dialog"
      aria-labelledby="delete-person-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="delete-dialog__card">
        <header className="delete-dialog__head">
          <h2 id="delete-person-title" className="delete-dialog__title">
            Supprimer le compte de {expected}
          </h2>
          <button
            type="button"
            className="delete-dialog__close"
            onClick={close}
            aria-label="Fermer"
            disabled={deleting}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <p className="delete-dialog__text">
          C’est immédiat et définitif. Disparaissent : le profil, les dates, les bilans, les avis.
        </p>

        {!preview && !error && <p className="delete-dialog__text">Un instant…</p>}

        {preview && preview.deleted.length > 0 && (
          <div className="delete-dialog__group">
            <p className="delete-dialog__label">Supprimées avec le compte</p>
            <ul className="delete-dialog__list">
              {preview.deleted.map((entity) => (
                <li key={entity.entityActorId}>
                  <b>{entity.brandName}</b>
                  {entity.subscribed && ' — son abonnement Pro est résilié'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview && preview.kept.length > 0 && (
          <div className="delete-dialog__group">
            <p className="delete-dialog__label">Restent à leurs autres membres</p>
            <ul className="delete-dialog__list">
              {preview.kept.map((entity) => (
                <li key={entity.entityActorId}>
                  <b>{entity.brandName}</b>
                  {keptNote(entity.endsOn)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="delete-dialog__problem" role="alert">
            {error}
          </p>
        )}

        {preview && (
          <>
            <label className="delete-dialog__confirm">
              <span>Retape « {expected} » pour confirmer</span>
              <input
                className="control delete-dialog__input"
                value={typed}
                autoComplete="off"
                disabled={deleting}
                onChange={(event) => setTyped(event.target.value)}
              />
            </label>
            <div className="delete-dialog__actions">
              <Button onClick={close} disabled={deleting}>
                Annuler
              </Button>
              <button
                type="button"
                className="delete-dialog__delete"
                disabled={typed.trim() !== expected || deleting}
                onClick={() => void remove()}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
