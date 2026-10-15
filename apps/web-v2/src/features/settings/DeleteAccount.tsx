/**
 * QUOI     — « Supprimer mon compte » : la carte en bas des Réglages, et la fenêtre qui montre ce qui
 *            va disparaître avant de demander le mot SUPPRIMER.
 * POURQUOI — lot 9b (Uriel, 11/10/2026) : la suppression est immédiate et définitive ; les enseignes
 *            dont on est seul membre partent avec, les partagées restent. La fenêtre les nomme.
 * ATTENTION — la fenêtre est `DeletionDialog` (components/ui), partagée avec l'administration.
 */
import { useEffect, useState } from 'react'
import { DeletionDialog } from '@/components/ui/DeletionDialog'
import { confirmsDeletion } from '@/lib/settings'
import { useAccountDeletion } from './useAccountDeletion'

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const { preview, loading, failed, deleting, load, run } = useAccountDeletion()
  const [typed, setTyped] = useState('')

  useEffect(() => {
    void load()
  }, [load])

  const problem = failed
    ? preview
      ? 'La suppression n’a pas abouti. Réessaie, ou écris-nous à appfellowship@pm.me.'
      : 'L’aperçu n’a pas pu être chargé.'
    : null

  return (
    <DeletionDialog
      title="Supprimer ton compte"
      intro="C’est immédiat et définitif. Disparaissent : ton profil, tes dates, tes bilans, tes avis."
      deletedHeading="Supprimées avec ton compte"
      preview={preview}
      loading={loading}
      problem={problem}
      deleting={deleting}
      confirmPrompt="Tape SUPPRIMER pour confirmer"
      typed={typed}
      onTyped={setTyped}
      confirmed={confirmsDeletion(typed)}
      onClose={onClose}
      onConfirm={() => void run()}
    />
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
