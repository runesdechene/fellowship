/**
 * QUOI     — la fenêtre « Supprimer l'enseigne » des Réglages : on retape son nom, puis la fonction
 *            serveur delete-account la supprime seule ; le compte reste.
 * POURQUOI — Uriel, 18/10/2026 : se débarrasser d'une enseigne de test sans passer par la base. Le
 *            serveur résilie l'abonnement et efface les fichiers, comme pour un compte supprimé.
 * ATTENTION — la fenêtre est `DeletionDialog` (components/ui) ; l'aperçu se déduit ici, sans appel.
 */
import { useState } from 'react'
import { DeletionDialog } from '@/components/ui/DeletionDialog'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface Props {
  entityId: string
  brandName: string
  subscribed: boolean
  onClose: () => void
}

export function DeleteEntityDialog({ entityId, brandName, subscribed, onClose }: Props) {
  const { reloadIdentity } = useAuth()
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [failed, setFailed] = useState(false)
  const expected = brandName.trim()

  async function remove() {
    setDeleting(true)
    setFailed(false)
    const response = await supabase.functions.invoke<{ done?: boolean }>('delete-account', {
      body: { entityId, confirm: true },
    })
    if (response.error || !response.data?.done) {
      setDeleting(false)
      setFailed(true)
      return
    }
    await reloadIdentity()
    onClose()
  }

  return (
    <DeletionDialog
      title={`Supprimer ${expected}`}
      intro="C’est immédiat et définitif. Disparaissent : sa vitrine, ses dates, ses bilans, ses avis."
      deletedHeading="Supprimée"
      preview={{
        deleted: [{ entityActorId: entityId, brandName: expected, subscribed }],
        kept: [],
      }}
      loading={false}
      problem={
        failed ? 'La suppression n’a pas abouti. Réessaie, ou écris-nous à contact@flw.sh.' : null
      }
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
