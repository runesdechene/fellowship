// Database types for Supabase
// Auto-generated from schema - keep in sync with supabase/schema.sql

export type RegistrationStatus = 
  | 'interested'
  | 'registered'
  | 'confirmed'
  | 'attended'
  | 'cancelled'

export type GroupRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  company: string | null
  bio: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  url: string | null
  start_date: string
  end_date: string | null
  created_by: string | null
  created_at: string
}

export interface Registration {
  id: string
  user_id: string
  event_id: string
  status: RegistrationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
      }
      registrations: {
        Row: Registration
        Insert: Omit<Registration, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Registration, 'id' | 'created_at' | 'updated_at'>>
      }
      groups: {
        Row: Group
        Insert: Omit<Group, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<Group, 'id' | 'created_at'>>
      }
      group_members: {
        Row: GroupMember
        Insert: Omit<GroupMember, 'id' | 'joined_at'> & { id?: string }
        Update: Partial<Omit<GroupMember, 'id' | 'joined_at'>>
      }
    }
  }
}
