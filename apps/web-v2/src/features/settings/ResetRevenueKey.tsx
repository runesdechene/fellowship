/**
 * QUOI     — « Réinitialiser ma phrase de passe » : la carte au-dessus de « Supprimer mon compte »
 *            et sa confirmation.
 * POURQUOI — recettes chiffrées (spec 2026-10-31) : une phrase oubliée ne se récupère pas, elle se
 *            remplace, et les recettes chiffrées de l'enseigne repartent à zéro.
 * ATTENTION — la carte reprend les classes de `delete-account` (maquette 2573:233, même carte) ;
 *            rien n'est affiché tant qu'aucune phrase n'existe pour l'enseigne active.
 */
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRevenueKey } from '@/lib/revenue-key'

export function ResetRevenueKey() {
  const { ready, status, reset } = useRevenueKey()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  if (!ready || status === 'none') return null

  async function confirm() {
    setBusy(true)
    setProblem(null)
    try {
      await reset()
      setOpen(false)
    } catch {
      setProblem('La réinitialisation n’a pas abouti. Réessaie, ou écris-nous à contact@flw.sh.')
    }
    setBusy(false)
  }

  return (
    <section className="delete-account" aria-labelledby="reset-revenue-key-title">
      <span className="delete-account__text">
        <span id="reset-revenue-key-title" className="delete-account__title">
          Réinitialiser ma phrase de passe
        </span>
        <span className="delete-account__note">
          Pour une phrase oubliée : tes recettes chiffrées repartent à zéro, dans tous tes bilans.
        </span>
      </span>
      <button
        type="button"
        className="delete-account__open"
        onClick={() => {
          setProblem(null)
          setOpen(true)
        }}
      >
        Réinitialiser…
      </button>
      {open && (
        <ConfirmDialog
          title="Réinitialiser ta phrase de passe ?"
          text="Tes recettes chiffrées seront effacées dans tous tes bilans de cette enseigne. Personne ne pourra les retrouver."
          confirmLabel="Réinitialiser"
          busy={busy}
          problem={problem}
          onConfirm={() => void confirm()}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}
