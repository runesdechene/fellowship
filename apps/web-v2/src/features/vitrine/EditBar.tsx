/**
 * QUOI     — la barre du mode édition : « Mode édition · Clique sur ce que tu veux changer »,
 *            Annuler, Enregistrer, et ce qui empêche d'enregistrer.
 * POURQUOI — lot 6b, maquette 2231:2 : rien n'est publié avant « Enregistrer » ; « Annuler » remet
 *            tout, après confirmation s'il y a des changements.
 */
import { Pencil } from 'lucide-react'
import type { VitrineEdit } from './useVitrineEdit'

interface EditBarProps {
  edit: VitrineEdit
  onClose: () => void
}

export function EditBar({ edit, onClose }: EditBarProps) {
  const message = edit.failed
    ? 'Tes modifications n’ont pas pu être enregistrées.'
    : (edit.problem ?? edit.imageError)

  return (
    <div className="edit-bar" role="toolbar" aria-label="Mode édition de la vitrine">
      <p className="edit-bar__title">
        <Pencil size={15} strokeWidth={2} />
        <b>Mode édition</b>
        <span className="edit-bar__hint">· Clique sur ce que tu veux changer</span>
      </p>
      {message && <p className="edit-bar__problem">{message}</p>}
      <div className="edit-bar__buttons">
        <button
          type="button"
          className="edit-bar__cancel"
          disabled={edit.saving}
          onClick={() => {
            if (edit.dirty && !window.confirm('Abandonner tes modifications ?')) return
            edit.reset()
            onClose()
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          className="edit-bar__save"
          disabled={!edit.dirty || edit.saving || edit.problem !== null}
          onClick={() => {
            void edit.save()
          }}
        >
          {edit.saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
