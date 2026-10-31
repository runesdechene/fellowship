/**
 * QUOI     — la date de la phrase de passe de chaque enseigne (revenue_keys.created_at), en une
 *            requête, et `reload` après un changement.
 * POURQUOI — Réglages · Enseignes montre la ligne « Recettes chiffrées » ou « Recettes en clair » de
 *            CHAQUE enseigne Pro du compte, quelle que soit l'enseigne active (Uriel, 31/10/2026).
 * ATTENTION — `chosenAt` reste null tant que rien n'est lu, `failed` si la lecture rate : une coupure
 *            ne passe jamais pour « aucune phrase », qui ferait proposer d'en créer une à tort.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

async function loadChosen(ids: string[]): Promise<Map<string, string>> {
  const rows = must(
    await supabase.from('revenue_keys').select('actor_id, created_at').in('actor_id', ids),
  )
  return new Map(rows.map((row) => [row.actor_id, row.created_at]))
}

export function useRevenueKeys(ids: string[]) {
  const [chosenAt, setChosenAt] = useState<Map<string, string> | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const key = ids.join(',')

  useEffect(() => {
    if (key === '') return
    let cancelled = false
    async function run() {
      let next: Map<string, string> | null
      try {
        next = await loadChosen(key.split(','))
      } catch {
        next = null
      }
      if (cancelled) return
      setFailed(next === null)
      if (next) setChosenAt(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key, version])

  const reload = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  return { chosenAt, failed, reload }
}
