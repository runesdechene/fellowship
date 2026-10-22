/**
 * QUOI     — charge l'accueil de l'administration : ses chiffres (admin_accueil) et les six
 *            dernières personnes passées.
 * POURQUOI — un seul appel rend tout ce qui se compte ; les personnes se lisent dans `users`, que la
 *            politique ouvre aux admins.
 */
import { useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type HomeFigures = Database['public']['Functions']['admin_accueil']['Returns'][number]

const RECENT_VISITORS = 6

async function loadHome() {
  const [figures, visitors] = await Promise.all([
    supabase.rpc('admin_accueil'),
    supabase
      .from('users')
      .select('actor_id, display_name, avatar_url, last_seen_at, visits')
      .not('last_seen_at', 'is', null)
      .order('last_seen_at', { ascending: false })
      .order('actor_id')
      .limit(RECENT_VISITORS),
  ])
  const row = must(figures)[0]
  if (!row) throw new Error('Chiffres indisponibles')
  return { figures: row, visitors: must(visitors) }
}

export type Visitor = Awaited<ReturnType<typeof loadHome>>['visitors'][number]

export function useAdminHome() {
  const [state, setState] = useState<{
    data: Awaited<ReturnType<typeof loadHome>> | null
    error: string | null
  }>({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadHome()
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
