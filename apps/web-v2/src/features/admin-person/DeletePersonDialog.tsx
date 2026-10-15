/**
 * QUOI     — « Supprimer le compte » sur la fiche d'une personne : charge l'aperçu, puis supprime
 *            quand on a retapé son prénom (ou son e-mail).
 * POURQUOI — l'aperçu et l'exécution suivent le même plan côté serveur (delete-account, avec
 *            `userId` pour un admin). Retaper le nom évite de supprimer la mauvaise fiche. La
 *            fenêtre elle-même est celle des Réglages (`DeletionDialog`).
 */
import { useEffect, useState } from 'react'
import { DeletionDialog } from '@/components/ui/DeletionDialog'
import { deleteAccount, previewDeletion } from '@/lib/admin-functions'
import type { DeletionPreview } from '@/lib/deletion-preview'
import type { PersonFields } from './useAdminPerson'

interface Props {
  person: PersonFields
  onClose: () => void
  onDeleted: () => void
}

export function DeletePersonDialog({ person, onClose, onDeleted }: Props) {
  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const expected = (person.display_name || person.email).trim()

  useEffect(() => {
    previewDeletion(person.actor_id)
      .then(setPreview)
      .catch((failure: unknown) =>
        setError(failure instanceof Error ? failure.message : 'L’aperçu n’a pas pu être chargé.'),
      )
  }, [person.actor_id])

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
    <DeletionDialog
      title={`Supprimer le compte de ${expected}`}
      intro="C’est immédiat et définitif. Disparaissent : le profil, les dates, les bilans, les avis."
      deletedHeading="Supprimées avec le compte"
      preview={preview}
      loading={!preview && !error}
      problem={error}
      deleting={deleting}
      confirmPrompt={`Retape « ${expected} » pour confirmer`}
      typed={typed}
      onTyped={setTyped}
      confirmed={typed.trim() === expected}
      onClose={onClose}
      onConfirm={() => void remove()}
    />
  )
}
