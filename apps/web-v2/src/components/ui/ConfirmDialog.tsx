/**
 * QUOI     — une fenêtre de confirmation : titre, texte, message d'échec, Annuler et le bouton
 *            d'action.
 * POURQUOI — supprimer un prospect ou défaire un rapprochement ne se fait pas d'un clic perdu.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus ; pendant `busy`, rien
 *            ne ferme la fenêtre.
 */
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  title: string
  text: string
  confirmLabel: string
  busy: boolean
  problem: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busy,
  problem,
  onConfirm,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  function close() {
    if (!busy) onClose()
  }
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p className="confirm-dialog__text">{text}</p>
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button variant="action" onClick={onConfirm} disabled={busy}>
            {busy ? 'Un instant…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
