/**
 * QUOI     — « Chiffrer mes recettes » : la carte au-dessus de « Supprimer mon compte » pour une
 *            enseigne qui a choisi « Garder en clair », et sa fenêtre « Choisir ta phrase de passe ».
 * POURQUOI — maquette 2580:917 : le bandeau de Mes bilans ne revient plus après un refus ; c'est
 *            ici qu'on change d'avis. Créer la phrase rend le refus sans effet (revenueInvitation).
 * ATTENTION — la carte reprend `delete-account` au ton neutre, comme ResetRevenueKey à sa place ;
 *            la fenêtre est celle du bilan, sans montants (features/reports/EncryptDialog).
 */
import { useState } from 'react'
import { EncryptDialog } from '@/features/reports/EncryptDialog'
import { useAuth } from '@/lib/auth'
import { revenueInvitation } from '@/lib/report-writes'
import { useRevenueKey } from '@/lib/revenue-key'

export function ChooseRevenueKey() {
  const { actor } = useAuth()
  const { ready, status, clearChosen } = useRevenueKey()
  const [open, setOpen] = useState(false)

  if (revenueInvitation(ready, status, clearChosen) !== 'settings' && !open) return null

  return (
    <section className="delete-account" aria-labelledby="choose-revenue-key-title">
      <span className="delete-account__text">
        <span id="choose-revenue-key-title" className="delete-account__title">
          Chiffrer mes recettes
        </span>
        <span className="delete-account__note">
          Tu les gardes en clair. Avec une phrase de passe, personne d’autre que toi ne pourra les
          lire.
        </span>
      </span>
      <button
        type="button"
        className="delete-account__open delete-account__open--neutral"
        onClick={() => {
          setOpen(true)
        }}
      >
        Choisir ma phrase…
      </button>
      {open && (
        <EncryptDialog
          subtitle={actor?.label ?? ''}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}
