/**
 * QUOI     — charge la fiche d'une personne : ses champs, ses enseignes, ses derniers gestes.
 * POURQUOI — trois fonctions admin_* gardées en base ; les gestes se lisent sur la personne et sur
 *            chacune de ses enseignes, d'où leur chargement en dernier.
 */
import { must, supabase } from '@/lib/supabase'
import { useAdminSheet } from '@/lib/useAdminSheet'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type PersonFields = Fn['admin_personne']['Returns'][number]
export type PersonEntity = Fn['admin_enseignes_de']['Returns'][number]
export type Gesture = Fn['admin_gestes']['Returns'][number]

export interface PersonSheet {
  person: PersonFields
  entities: PersonEntity[]
  gestures: Gesture[]
}

async function loadPerson(id: string): Promise<PersonSheet | null> {
  const [people, entities] = await Promise.all([
    supabase.rpc('admin_personne', { p_id: id }),
    supabase.rpc('admin_enseignes_de', { p_person: id }),
  ])
  const person = must(people)[0]
  if (!person) return null
  const owned = must(entities)
  const gestures = must(
    await supabase.rpc('admin_gestes', { p_actors: [id, ...owned.map((e) => e.entity_id)] }),
  )
  return { person, entities: owned, gestures }
}

export function useAdminPerson(id: string) {
  return useAdminSheet(id, loadPerson, 'Personne introuvable')
}
