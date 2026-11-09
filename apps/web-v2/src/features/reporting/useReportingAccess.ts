/**
 * QUOI     — les enseignes de la personne connectée qui ont le reporting (une ligne dans
 *            reporting_entreprises).
 * POURQUOI — la zone Reporting ne s'ouvre qu'à elles : l'entrée du sélecteur et la garde des pages
 *            lisent cette liste. La base ne rend que les enseignes dont on est membre (can_act_as).
 */
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { must, supabase } from '@/lib/supabase'

/** `null` tant que la liste n'est pas lue. */
export function useReportingAccess(): ReadonlySet<string> | null {
  const { user } = useAuth()
  const userId = user?.id
  const [entities, setEntities] = useState<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function run() {
      try {
        const rows = must(await supabase.from('reporting_entreprises').select('entity_actor_id'))
        if (cancelled) return
        setEntities(new Set(rows.map((row) => row.entity_actor_id)))
      } catch {
        // Sans réponse, la zone reste fermée : elle ne s'ouvre jamais par défaut.
        if (!cancelled) setEntities(new Set())
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  return entities
}
