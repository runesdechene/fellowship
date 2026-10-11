/**
 * QUOI     — « Supprimer mon compte » : la carte en bas des Réglages, et la fenêtre qui montre ce qui
 *            va disparaître avant de demander le mot SUPPRIMER.
 * POURQUOI — lot 9b (Uriel, 11/10/2026) : la suppression est immédiate et définitive ; les enseignes
 *            dont on est seul membre partent avec, les partagées restent. La fenêtre les nomme.
 * ATTENTION — l'élément <dialog> du navigateur fait le voile, Échap et le piège du focus. Pendant la
 *            suppression, ni Échap ni le voile ne ferment la fenêtre.
 */
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { confirmsDeletion } from '@/lib/settings'
import { useAccountDeletion } from './useAccountDeletion'

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { preview, loading, failed, deleting, load, run } = useAccountDeletion()
  const [typed, setTyped] = useState('')

  useEffect(() => {
    dialog.current?.showModal()
    void load()
  }, [load])

  function close() {
    if (!deleting) onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="delete-dialog"
      aria-labelledby="delete-dialog-title"
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
          <h2 id="delete-dialog-title" className="delete-dialog__title">
            Supprimer ton compte
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
          C’est immédiat et définitif. Disparaissent : ton profil, tes dates, tes bilans, tes avis.
        </p>

        {loading && <p className="delete-dialog__text">Un instant…</p>}

        {preview && preview.deleted.length > 0 && (
          <div className="delete-dialog__group">
            <p className="delete-dialog__label">Supprimées avec ton compte</p>
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
                <li key={entity.entityActorId}>{entity.brandName}</li>
              ))}
            </ul>
          </div>
        )}

        {failed && (
          <p className="delete-dialog__problem">
            {preview
              ? 'La suppression n’a pas abouti. Réessaie, ou écris-nous à appfellowship@pm.me.'
              : 'L’aperçu n’a pas pu être chargé.'}
          </p>
        )}

        {preview && (
          <>
            <label className="delete-dialog__confirm">
              <span>Tape SUPPRIMER pour confirmer</span>
              <input
                className="control delete-dialog__input"
                value={typed}
                autoComplete="off"
                disabled={deleting}
                onChange={(event) => {
                  setTyped(event.target.value)
                }}
              />
            </label>
            <div className="delete-dialog__actions">
              <Button onClick={close} disabled={deleting}>
                Annuler
              </Button>
              <button
                type="button"
                className="delete-dialog__delete"
                disabled={!confirmsDeletion(typed) || deleting}
                onClick={() => void run()}
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

export function DeleteAccount() {
  const [open, setOpen] = useState(false)

  return (
    <section className="delete-account" aria-labelledby="delete-account-title">
      <span className="delete-account__text">
        <span id="delete-account-title" className="delete-account__title">
          Supprimer mon compte
        </span>
        <span className="delete-account__note">
          Efface ton profil, tes dates et tes bilans. Tes enseignes partagées restent à leurs autres
          membres.
        </span>
      </span>
      <button
        type="button"
        className="delete-account__open"
        onClick={() => {
          setOpen(true)
        }}
      >
        Supprimer…
      </button>
      {open && (
        <DeleteDialog
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}
