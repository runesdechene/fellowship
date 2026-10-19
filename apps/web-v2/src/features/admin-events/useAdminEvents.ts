/**
 * QUOI     — charge une page de la liste des événements de l'administration, et en supprime un.
 * POURQUOI — la base cherche, compte les exposants et pagine (admin_evenements) ; supprimer passe par
 *            la politique `admin_delete_events`, et toutes les tables liées suivent en cascade.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import type { EventsQuery } from '@/lib/admin-events'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type AdminEvent = Database['public']['Functions']['admin_evenements']['Returns'][number]

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function useAdminEvents({ q, page }: EventsQuery) {
  const [state, setState] = useState<{ events: AdminEvent[] | null; error: string | null }>({
    events: null,
    error: null,
  })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const events = must(await supabase.rpc('admin_evenements', { p_q: q, p_page: page }))
        if (cancelled) return
        setState({ events, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          events: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [q, page, round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
