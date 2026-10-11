/**
 * QUOI     — l'aperçu de la suppression du compte, puis la suppression elle-même, par la fonction
 *            serveur delete-account.
 * POURQUOI — lot 9b : l'aperçu et l'exécution suivent le même plan (deletion-plan.ts, côté
 *            serveur). Réussie, la session n'existe plus : on la ferme et on recharge l'app depuis
 *            l'accueil, qui repart propre.
 */
import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export interface Preview {
  deleted: { entityActorId: string; brandName: string; subscribed: boolean }[]
  /** endsOn : la fin de la période payée, quand l'abonnement de l'enseigne s'y arrête. */
  kept: { entityActorId: string; brandName: string; endsOn: string | null }[]
}

export function useAccountDeletion() {
  const { signOut } = useAuth()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const response = await supabase.functions.invoke<Preview>('delete-account', {
      body: { confirm: false },
    })
    const found = response.error ? null : response.data
    setPreview(found)
    setFailed(!found)
    setLoading(false)
  }, [])

  const run = useCallback(async (): Promise<boolean> => {
    setDeleting(true)
    setFailed(false)
    const response = await supabase.functions.invoke<{ done?: boolean }>('delete-account', {
      body: { confirm: true },
    })
    if (response.error || !response.data?.done) {
      setDeleting(false)
      setFailed(true)
      return false
    }
    await signOut()
    window.location.assign(import.meta.env.BASE_URL)
    return true
  }, [signOut])

  return { preview, loading, failed, deleting, load, run }
}
