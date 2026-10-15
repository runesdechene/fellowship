/**
 * QUOI     — charge la fiche d'une enseigne : ses champs, ses comptes reliés, ses derniers gestes.
 * POURQUOI — trois fonctions admin_* gardées en base ; `reload` relit après une correction.
 */
import { must, supabase } from '@/lib/supabase'
import { useAdminSheet } from '@/lib/useAdminSheet'
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
  return useAdminSheet(id, loadEntity, 'Enseigne introuvable')
}
