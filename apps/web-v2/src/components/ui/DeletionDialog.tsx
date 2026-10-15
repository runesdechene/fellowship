/**
 * QUOI     — la fenêtre de suppression d'un compte : titre, texte, aperçu (enseignes supprimées, puis
 *            gardées), message d'échec, champ de confirmation et boutons.
 * POURQUOI — Réglages et l'administration montrent le même aperçu ; seuls les mots et la condition
 *            de confirmation changent, et viennent par les props.
 * ATTENTION — l'élément <dialog> du navigateur fait le voile, Échap et le piège du focus. Pendant la
 *            suppression, ni Échap ni le voile ne ferment la fenêtre.
 */
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import type { DeletionPreview } from '@/lib/deletion-preview'
import { keptNote } from '@/lib/settings'

interface Props {
  title: string
  intro: string
  deletedHeading: string
  preview: DeletionPreview | null
  loading: boolean
  /** Le message d'échec, ou null. */
  problem: string | null
  deleting: boolean
  confirmPrompt: string
  typed: string
  onTyped: (value: string) => void
  /** Vrai quand ce qui est tapé autorise la suppression. */
  confirmed: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeletionDialog(props: Props) {
  const { preview, deleting, typed } = props
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!deleting) props.onClose()
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
            {props.title}
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

        <p className="delete-dialog__text">{props.intro}</p>

        {props.loading && <p className="delete-dialog__text">Un instant…</p>}

        {preview && preview.deleted.length > 0 && (
          <div className="delete-dialog__group">
            <p className="delete-dialog__label">{props.deletedHeading}</p>
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

        {props.problem && <p className="delete-dialog__problem">{props.problem}</p>}

        {preview && (
          <>
            <label className="delete-dialog__confirm">
              <span>{props.confirmPrompt}</span>
              <input
                className="control delete-dialog__input"
                value={typed}
                autoComplete="off"
                disabled={deleting}
                onChange={(event) => props.onTyped(event.target.value)}
              />
            </label>
            <div className="delete-dialog__actions">
              <Button onClick={close} disabled={deleting}>
                Annuler
              </Button>
              <button
                type="button"
                className="delete-dialog__delete"
                disabled={!props.confirmed || deleting}
                onClick={props.onConfirm}
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
