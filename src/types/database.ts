import type { Database } from './supabase'

export type UserRow = Database['public']['Tables']['users']['Row']
export type EntityRow = Database['public']['Tables']['entities']['Row']
export type EventRow = Database['public']['Tables']['events']['Row']
export type ParticipationRow = Database['public']['Tables']['participations']['Row']
export type ParticipationStatus = Database['public']['Enums']['participation_status']
export type EntityType = Database['public']['Enums']['entity_type']

/** L'identité sous laquelle on agit : soit la personne, soit une de ses enseignes. */
export interface Actor {
  id: string
  kind: 'person' | 'entity'
  /** Nom affiché : enseigne pour une entité, nom d'usage pour une personne. */
  label: string
  avatarUrl: string | null
  /** Libellé du type de compte, affiché sous le nom dans la colonne de gauche. */
  roleLabel: string
}
