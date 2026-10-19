/**
 * QUOI     — le nombre de signalements en attente, pour la pastille de la navigation admin.
 * POURQUOI — maquette 2338:23 : Signalements porte son nombre. Relu à chaque changement d'adresse —
 *            après avoir traité, revenir dans la liste suffit à le mettre à jour.
 * ATTENTION — seule une lecture admin passe (politique de `content_reports`) ; un échec rend 0 :
 *            la pastille se tait plutôt que d'afficher une erreur dans la navigation.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** `when` vide (hors de l'administration) : rien n'est lu. */
export function usePendingReports(when: string): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!when) return
    let cancelled = false
    async function run() {
      const { count: pending } = await supabase
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!cancelled) setCount(pending ?? 0)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [when])
  return count
}
