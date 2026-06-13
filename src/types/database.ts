import type { Database } from './supabase'

// Accounts foundation (actors model)
export type ActorRow        = Database['public']['Tables']['actors']['Row']
export type UserRow         = Database['public']['Tables']['users']['Row']
export type EntityRow       = Database['public']['Tables']['entities']['Row']
export type MembershipRow   = Database['public']['Tables']['memberships']['Row']
export type EntityType      = Database['public']['Enums']['entity_type']

/** Un lien externe de vitrine (stocké dans entities.links jsonb). */
export interface VitrineLink {
  type: 'website' | 'shop' | 'instagram' | 'facebook' | 'other'
  label: string
  url: string
}

// Table row types
export type Event = Database['public']['Tables']['events']['Row']
export type Participation = Database['public']['Tables']['participations']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type EventReport = Database['public']['Tables']['event_reports']['Row']

// Registre financier (event_ledger_entries) — types manuels tant que supabase.ts
// n'est pas régénéré. source/direction/category alignés sur le CHECK SQL.
export type LedgerDirection = 'in' | 'out'
export type LedgerCategory =
  | 'emplacement' | 'cachet' | 'essence' | 'peage'
  | 'hebergement' | 'repas' | 'remboursement' | 'ventes' | 'autre'
export type PaymentOrientation = 'payeur' | 'paye'

export interface LedgerEntry {
  id: string
  report_id: string
  actor_id: string
  event_id: string
  label: string | null
  amount: number
  direction: LedgerDirection
  category: LedgerCategory
  source: 'stepper' | 'manual'
  created_at: string
}

export type LedgerEntryInsert = Omit<LedgerEntry, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}
export type Review = Database['public']['Tables']['reviews']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type ParticipationInsert = Database['public']['Tables']['participations']['Insert']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type EventReportInsert = Database['public']['Tables']['event_reports']['Insert']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']

// Update types
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type ParticipationUpdate = Database['public']['Tables']['participations']['Update']

// Tag types
export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

// Enum types
export type UserType = Database['public']['Enums']['user_type']
export type UserSex = Database['public']['Enums']['user_sex']
export type UserPlan = Database['public']['Enums']['user_plan']
export type ParticipationStatus = Database['public']['Enums']['participation_status']
export type ParticipationVisibility = Database['public']['Enums']['participation_visibility']
export type NoteVisibility = Database['public']['Enums']['note_visibility']
export type NotificationType = Database['public']['Enums']['notification_type']

// Computed types
export interface EventWithScore extends Event {
  avg_overall: number | null
  review_count: number | null
  avg_affluence: number | null
  avg_organisation: number | null
  avg_rentabilite: number | null
}

export interface ParticipationWithEvent extends Participation {
  events: Event
}

export interface NoteWithAuthor extends Note {
  actor_public: { actor_id: string; label: string | null; avatar_url: string | null; entity_type: string | null; kind: string } | null
  is_friend_of_friend?: boolean
  mutual_friend_name?: string
}

export interface PaymentEntry {
  amount: number
  date: string
  label: string
}

// Notification data payload (stored in JSONB `data` column)
export interface NotificationData {
  actor_id?: string
  actor_name?: string
  actor_avatar_url?: string
  event_id?: string
  event_name?: string
  friend_name?: string
  follower_name?: string
  status?: string
}
