import type { Database } from './supabase'

// Table row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Participation = Database['public']['Tables']['participations']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type EventReport = Database['public']['Tables']['event_reports']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type ParticipationInsert = Database['public']['Tables']['participations']['Insert']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type EventReportInsert = Database['public']['Tables']['event_reports']['Insert']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type ParticipationUpdate = Database['public']['Tables']['participations']['Update']

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

export interface ParticipationWithUser extends Participation {
  profiles: Profile
}

export interface NoteWithAuthor extends Note {
  profiles: Profile
  is_friend_of_friend?: boolean
  mutual_friend_name?: string
}

// Notification data payload (stored in JSONB `data` column)
export interface NotificationData {
  actor_id?: string
  actor_name?: string
  event_id?: string
  event_name?: string
  friend_name?: string
  follower_name?: string
}
