/**
 * QUOI     — charge la fiche d'une enseigne : ses champs, ses comptes reliés, ses derniers gestes.
 * POURQUOI — trois fonctions admin_* gardées en base ; `reload` relit après une correction.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type EntityFields = Fn['admin_enseigne']['Returns'][number]
export type MemberRow = Fn['admin_membres']['Returns'][number]
export type Gesture = Fn['admin_gestes']['Returns'][number]

export interface EntitySheet {
  entity: EntityFields
  members: MemberRow[]
  gestures: Gesture[]
}

async function loadEntity(id: string): Promise<EntitySheet | null> {
  const entity = must(await supabase.rpc('admin_enseigne', { p_id: id }))[0]
  if (!entity) return null
  const [members, gestures] = await Promise.all([
    supabase.rpc('admin_membres', { p_entities: [id] }),
    supabase.rpc('admin_gestes', { p_actors: [id] }),
  ])
  return { entity, members: must(members), gestures: must(gestures) }
}

export function useAdminEntity(id: string) {
  const [state, setState] = useState<{
    id: string
    data: EntitySheet | null
    error: string | null
  }>({ id, data: null, error: null })
  const [round, setRound] = useState(0)
  const reload = useCallback(() => setRound((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadEntity(id)
        if (cancelled) return
        setState({ id, data, error: data ? null : 'Enseigne introuvable' })
      } catch (error) {
        if (cancelled) return
        setState({
          id,
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id, round])

  // Tant que l'enseigne de l'adresse n'est pas chargée, l'ancienne ne s'affiche pas dessous.
  if (state.id !== id) return { data: null, error: null, reload }
  return { data: state.data, error: state.error, reload }
}
