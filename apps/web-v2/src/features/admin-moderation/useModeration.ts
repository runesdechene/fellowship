/**
 * QUOI     — charge les signalements d'un statut, et les traite (résolu ou rejeté, avec une note).
 * POURQUOI — la base enrichit chaque signalement (qui signale, ce qui est visé) en une requête
 *            (admin_signalements) ; traiter passe par la politique admin d'`update`.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ModerationStatus } from '@/lib/moderation'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type Report = Database['public']['Functions']['admin_signalements']['Returns'][number]

export async function resolveReport(
  id: string,
  status: 'resolved' | 'dismissed',
  note: string,
  adminId: string,
): Promise<void> {
  const { error } = await supabase
    .from('content_reports')
    .update({
      status,
      admin_note: note.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by_actor_id: adminId,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export function useModeration(status: ModerationStatus) {
  const [state, setState] = useState<{ reports: Report[] | null; error: string | null }>({
    reports: null,
    error: null,
  })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const reports = must(await supabase.rpc('admin_signalements', { p_statut: status }))
        if (cancelled) return
        setState({ reports, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          reports: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [status, round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
