export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["actor_kind"]
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["actor_kind"]
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["actor_kind"]
        }
        Relationships: []
      }
      admin_labels: {
        Row: {
          actor_id: string
          created_at: string
          label: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          label: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_labels_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          actor_id: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
        }
        Insert: {
          actor_id: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          actor_id?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_note: string | null
          comment: string | null
          created_at: string
          id: string
          reason: string
          reporter_actor_id: string | null
          reporter_auth_id: string | null
          resolved_at: string | null
          resolved_by_actor_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_note?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_actor_id?: string | null
          reporter_auth_id?: string | null
          resolved_at?: string | null
          resolved_by_actor_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_note?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_actor_id?: string | null
          reporter_auth_id?: string | null
          resolved_at?: string | null
          resolved_by_actor_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_actor_id_fkey"
            columns: ["reporter_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_resolved_by_actor_id_fkey"
            columns: ["resolved_by_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_mutes: {
        Row: {
          actor_id: string
          created_at: string
          event_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_mutes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_mutes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          actor_id: string
          avatar_url: string | null
          banner_position: number
          banner_url: string | null
          billing_interval: string | null
          billing_no_siren: boolean
          bio: string | null
          brand_name: string
          city: string | null
          comped_pro_until: string | null
          craft_type: string | null
          created_at: string
          current_period_end: string | null
          department: string | null
          discount_end: string | null
          discount_label: string | null
          is_ambassador: boolean
          legal_name: string | null
          links: Json
          location: string | null
          paid_by_user: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          postal_code: string | null
          public_slug: string | null
          siren: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_end: string | null
          type: Database["public"]["Enums"]["entity_type"]
          verified: boolean
          website: string | null
        }
        Insert: {
          actor_id: string
          avatar_url?: string | null
          banner_position?: number
          banner_url?: string | null
          billing_interval?: string | null
          billing_no_siren?: boolean
          bio?: string | null
          brand_name: string
          city?: string | null
          comped_pro_until?: string | null
          craft_type?: string | null
          created_at?: string
          current_period_end?: string | null
          department?: string | null
          discount_end?: string | null
          discount_label?: string | null
          is_ambassador?: boolean
          legal_name?: string | null
          links?: Json
          location?: string | null
          paid_by_user?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          public_slug?: string | null
          siren?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          type: Database["public"]["Enums"]["entity_type"]
          verified?: boolean
          website?: string | null
        }
        Update: {
          actor_id?: string
          avatar_url?: string | null
          banner_position?: number
          banner_url?: string | null
          billing_interval?: string | null
          billing_no_siren?: boolean
          bio?: string | null
          brand_name?: string
          city?: string | null
          comped_pro_until?: string | null
          craft_type?: string | null
          created_at?: string
          current_period_end?: string | null
          department?: string | null
          discount_end?: string | null
          discount_label?: string | null
          is_ambassador?: boolean
          legal_name?: string | null
          links?: Json
          location?: string | null
          paid_by_user?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          public_slug?: string | null
          siren?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          type?: Database["public"]["Enums"]["entity_type"]
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_paid_by_user_fkey"
            columns: ["paid_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      entity_bases: {
        Row: {
          address: string
          entity_id: string
          latitude: number
          longitude: number
          updated_at: string
        }
        Insert: {
          address: string
          entity_id: string
          latitude: number
          longitude: number
          updated_at?: string
        }
        Update: {
          address?: string
          entity_id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_bases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      event_ledger_entries: {
        Row: {
          actor_id: string
          amount: number
          category: string
          created_at: string
          direction: string
          event_id: string
          id: string
          label: string | null
          report_id: string
          source: string
        }
        Insert: {
          actor_id: string
          amount: number
          category: string
          created_at?: string
          direction: string
          event_id: string
          id?: string
          label?: string | null
          report_id: string
          source?: string
        }
        Update: {
          actor_id?: string
          amount?: number
          category?: string
          created_at?: string
          direction?: string
          event_id?: string
          id?: string
          label?: string | null
          report_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ledger_entries_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ledger_entries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "event_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reports: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          booth_cost: number | null
          charges: number | null
          created_at: string
          event_id: string
          id: string
          improvements: string[] | null
          media_paths: string[]
          note: string | null
          revenue: number | null
          wins: string[] | null
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          booth_cost?: number | null
          charges?: number | null
          created_at?: string
          event_id: string
          id?: string
          improvements?: string[] | null
          media_paths?: string[]
          note?: string | null
          revenue?: number | null
          wins?: string[] | null
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          booth_cost?: number | null
          charges?: number | null
          created_at?: string
          event_id?: string
          id?: string
          improvements?: string[] | null
          media_paths?: string[]
          note?: string | null
          revenue?: number | null
          wins?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "event_reports_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_thread_replies: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_thread_replies_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "event_thread_replies_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "event_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      event_threads: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          audience: Database["public"]["Enums"]["thread_audience"]
          best_reply_id: string | null
          body: string | null
          created_at: string
          event_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          audience: Database["public"]["Enums"]["thread_audience"]
          best_reply_id?: string | null
          body?: string | null
          created_at?: string
          event_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          audience?: Database["public"]["Enums"]["thread_audience"]
          best_reply_id?: string | null
          body?: string | null
          created_at?: string
          event_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_threads_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "event_threads_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_threads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_best_reply"
            columns: ["best_reply_id"]
            isOneToOne: false
            referencedRelation: "event_thread_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_versions: {
        Row: {
          address: string | null
          author_entity: string | null
          author_user: string | null
          city: string
          contact_email: string | null
          created_at: string
          department: string
          description: string | null
          end_date: string
          event_id: string
          external_url: string | null
          geo_precision: string | null
          id: number
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          note: string | null
          registration_deadline: string | null
          registration_note: string | null
          registration_url: string | null
          start_date: string
          tags: string[] | null
        }
        Insert: {
          address?: string | null
          author_entity?: string | null
          author_user?: string | null
          city: string
          contact_email?: string | null
          created_at?: string
          department: string
          description?: string | null
          end_date: string
          event_id: string
          external_url?: string | null
          geo_precision?: string | null
          id?: number
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          note?: string | null
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          start_date: string
          tags?: string[] | null
        }
        Update: {
          address?: string | null
          author_entity?: string | null
          author_user?: string | null
          city?: string
          contact_email?: string | null
          created_at?: string
          department?: string
          description?: string | null
          end_date?: string
          event_id?: string
          external_url?: string | null
          geo_precision?: string | null
          id?: number
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          note?: string | null
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          start_date?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_versions_author_entity_fkey"
            columns: ["author_entity"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "event_versions_author_user_fkey"
            columns: ["author_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "event_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          acted_by_user_id: string | null
          address: string | null
          city: string
          contact_email: string | null
          created_at: string
          created_by_actor: string | null
          department: string
          description: string | null
          edition: number | null
          end_date: string
          expected_attendance: string | null
          external_url: string | null
          geo_precision: string | null
          id: string
          image_url: string | null
          is_private: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: string | null
          previous_edition_id: string | null
          registration_deadline: string | null
          registration_note: string | null
          registration_url: string | null
          slug: string | null
          stand_price: string | null
          stand_size: string | null
          start_date: string
          tags: string[] | null
        }
        Insert: {
          acted_by_user_id?: string | null
          address?: string | null
          city: string
          contact_email?: string | null
          created_at?: string
          created_by_actor?: string | null
          department: string
          description?: string | null
          edition?: number | null
          end_date: string
          expected_attendance?: string | null
          external_url?: string | null
          geo_precision?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: string | null
          previous_edition_id?: string | null
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          slug?: string | null
          stand_price?: string | null
          stand_size?: string | null
          start_date: string
          tags?: string[] | null
        }
        Update: {
          acted_by_user_id?: string | null
          address?: string | null
          city?: string
          contact_email?: string | null
          created_at?: string
          created_by_actor?: string | null
          department?: string
          description?: string | null
          edition?: number | null
          end_date?: string
          expected_attendance?: string | null
          external_url?: string | null
          geo_precision?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: string | null
          previous_edition_id?: string | null
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          slug?: string | null
          stand_price?: string | null
          stand_size?: string | null
          start_date?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "events_created_by_actor_fkey"
            columns: ["created_by_actor"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_previous_edition_id_fkey"
            columns: ["previous_edition_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_actor: string
          following_actor: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_actor: string
          following_actor: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_actor?: string
          following_actor?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_actor_fkey"
            columns: ["follower_actor"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_actor_fkey"
            columns: ["following_actor"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          entity_actor_id: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_actor_id: string
        }
        Insert: {
          created_at?: string
          entity_actor_id: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_actor_id: string
        }
        Update: {
          created_at?: string
          entity_actor_id?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_actor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_entity_actor_id_fkey"
            columns: ["entity_actor_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "memberships_user_actor_id_fkey"
            columns: ["user_actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      notes: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          content: string
          created_at: string
          event_id: string
          id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          content: string
          created_at?: string
          event_id: string
          id?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "notes_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "notes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          data: Json
          id: string
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id: string
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      participation_dossiers: {
        Row: {
          actor_id: string
          application_note: string | null
          application_sent_on: string | null
          balance_due_on: string | null
          deposit_amount: number | null
          event_id: string
          revenue_goal: number | null
          updated_at: string
        }
        Insert: {
          actor_id: string
          application_note?: string | null
          application_sent_on?: string | null
          balance_due_on?: string | null
          deposit_amount?: number | null
          event_id: string
          revenue_goal?: number | null
          updated_at?: string
        }
        Update: {
          actor_id?: string
          application_note?: string | null
          application_sent_on?: string | null
          balance_due_on?: string | null
          deposit_amount?: number | null
          event_id?: string
          revenue_goal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participation_dossiers_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_dossiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          created_at: string
          event_id: string
          id: string
          payment_orientation: string
          payment_status: string | null
          payments: Json | null
          refusal_note: string | null
          remind_deadline: boolean
          status: Database["public"]["Enums"]["participation_status"]
          total_cost: number | null
          visibility: Database["public"]["Enums"]["participation_visibility"]
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          created_at?: string
          event_id: string
          id?: string
          payment_orientation?: string
          payment_status?: string | null
          payments?: Json | null
          refusal_note?: string | null
          remind_deadline?: boolean
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          visibility?: Database["public"]["Enums"]["participation_visibility"]
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          created_at?: string
          event_id?: string
          id?: string
          payment_orientation?: string
          payment_status?: string | null
          payments?: Json | null
          refusal_note?: string | null
          remind_deadline?: boolean
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          visibility?: Database["public"]["Enums"]["participation_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "participations_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "participations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_messages: {
        Row: {
          body_text: string
          created_at: string
          delivery: string | null
          direction: string
          from_email: string
          has_attachments: boolean
          id: string
          in_reply_to: string | null
          message_id: string | null
          prospect_id: string | null
          received_at: string | null
          references_ids: string[]
          resend_id: string | null
          sender_id: string | null
          sent_at: string | null
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body_text?: string
          created_at?: string
          delivery?: string | null
          direction: string
          from_email: string
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          prospect_id?: string | null
          received_at?: string | null
          references_ids?: string[]
          resend_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          subject?: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body_text?: string
          created_at?: string
          delivery?: string | null
          direction?: string
          from_email?: string
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          prospect_id?: string | null
          received_at?: string | null
          references_ids?: string[]
          resend_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "prospect_senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prospect_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_senders: {
        Row: {
          active: boolean
          alias: string
          created_at: string
          display_name: string
          id: string
          signature: string
          user_id: string
        }
        Insert: {
          active?: boolean
          alias: string
          created_at?: string
          display_name: string
          id?: string
          signature?: string
          user_id: string
        }
        Update: {
          active?: boolean
          alias?: string
          created_at?: string
          display_name?: string
          id?: string
          signature?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_senders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      prospect_templates: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          subject: string
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          name: string
          subject?: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          a_relancer: boolean
          activity: string | null
          brand: string | null
          city: string | null
          contact_channel: string | null
          contacted_on: string | null
          created_at: string
          created_by: string | null
          email: string | null
          email_status: string
          id: string
          linked_at: string | null
          linked_by: string | null
          name: string | null
          note: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          a_relancer?: boolean
          activity?: string | null
          brand?: string | null
          city?: string | null
          contact_channel?: string | null
          contacted_on?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_status?: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name?: string | null
          note?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          a_relancer?: boolean
          activity?: string | null
          brand?: string | null
          city?: string | null
          contact_channel?: string | null
          contacted_on?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_status?: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name?: string | null
          note?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "prospects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          owner_entity_id: string
        }
        Insert: {
          code: string
          created_at?: string
          owner_entity_id: string
        }
        Update: {
          code?: string
          created_at?: string
          owner_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_owner_entity_id_fkey"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      referrals: {
        Row: {
          attributed_at: string
          filleul_entity_id: string
          filleul_first_paid_at: string | null
          filleul_gift_granted: boolean
          id: string
          parrain_entity_id: string
          parrain_rewarded_at: string | null
          status: string
        }
        Insert: {
          attributed_at?: string
          filleul_entity_id: string
          filleul_first_paid_at?: string | null
          filleul_gift_granted?: boolean
          id?: string
          parrain_entity_id: string
          parrain_rewarded_at?: string | null
          status?: string
        }
        Update: {
          attributed_at?: string
          filleul_entity_id?: string
          filleul_first_paid_at?: string | null
          filleul_gift_granted?: boolean
          id?: string
          parrain_entity_id?: string
          parrain_rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_filleul_entity_id_fkey"
            columns: ["filleul_entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "referrals_parrain_entity_id_fkey"
            columns: ["parrain_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      review_replies: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          body: string
          created_at: string
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          body: string
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          body?: string
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "review_replies_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string
          affluence: number
          anonymous: boolean
          comment: string | null
          created_at: string
          event_id: string
          id: string
          organisation: number
          rentabilite: number
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id: string
          affluence: number
          anonymous?: boolean
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          organisation: number
          rentabilite: number
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string
          affluence?: number
          anonymous?: boolean
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          organisation?: number
          rentabilite?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_acted_by_user_id_fkey"
            columns: ["acted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "reviews_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events_processed: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      suggestion_dismissals: {
        Row: {
          actor_id: string
          created_at: string
          event_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_dismissals_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          bg_color: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          text_color: string
        }
        Insert: {
          bg_color: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          text_color: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          text_color?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          actor_id: string | null
          avatar_url: string | null
          craft: string
          created_at: string
          entity_slug: string | null
          id: string
          is_active: boolean
          name: string
          quote: string
          sort_order: number
        }
        Insert: {
          actor_id?: string | null
          avatar_url?: string | null
          craft: string
          created_at?: string
          entity_slug?: string | null
          id?: string
          is_active?: boolean
          name: string
          quote: string
          sort_order?: number
        }
        Update: {
          actor_id?: string | null
          avatar_url?: string | null
          craft?: string
          created_at?: string
          entity_slug?: string | null
          id?: string
          is_active?: boolean
          name?: string
          quote?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          actor_id: string
          auth_id: string
          avatar_url: string | null
          city: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string
          handle: string | null
          phone: string | null
          postal_code: string | null
          push_muted: string[]
          role: string
          sex: Database["public"]["Enums"]["user_sex"] | null
          suspended_at: string | null
        }
        Insert: {
          actor_id: string
          auth_id: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email: string
          handle?: string | null
          phone?: string | null
          postal_code?: string | null
          push_muted?: string[]
          role?: string
          sex?: Database["public"]["Enums"]["user_sex"] | null
          suspended_at?: string | null
        }
        Update: {
          actor_id?: string
          auth_id?: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string
          handle?: string | null
          phone?: string | null
          postal_code?: string | null
          push_muted?: string[]
          role?: string
          sex?: Database["public"]["Enums"]["user_sex"] | null
          suspended_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      actor_public: {
        Row: {
          actor_id: string | null
          avatar_url: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          kind: Database["public"]["Enums"]["actor_kind"] | null
          label: string | null
          public_slug: string | null
        }
        Relationships: []
      }
      event_scores: {
        Row: {
          avg_affluence: number | null
          avg_organisation: number | null
          avg_overall: number | null
          avg_rentabilite: number | null
          event_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          friend_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_actor_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_actor_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _evenement_lisible: { Args: { p_event: string }; Returns: boolean }
      accounts_to_follow: {
        Args: { p_actor: string }
        Returns: {
          avatar: string
          city: string
          id: string
          name: string
          reason: Json
          slug: string
        }[]
      }
      admin_activite: {
        Args: { p_actors: string[] }
        Returns: {
          abonnes: number
          avis: number
          bilans: number
          dates: number
          fiches: number
          questions: number
        }[]
      }
      admin_ambassadeur: {
        Args: { p_entity: string; p_oui: boolean }
        Returns: undefined
      }
      admin_cherche: {
        Args: { p_q: string; p_valeur: string }
        Returns: boolean
      }
      admin_chiffres: {
        Args: never
        Returns: {
          comptes: number
          comptes_semaine: number
          echecs: number
          essais: number
          essais_bientot: number
          pro: number
          pro_offerts: number
        }[]
      }
      admin_corriger_enseigne: {
        Args: {
          p_brand_name: string
          p_city: string
          p_craft_type: string
          p_id: string
          p_legal_name: string
          p_public_slug: string
          p_siren: string
        }
        Returns: undefined
      }
      admin_corriger_personne: {
        Args: {
          p_display_name: string
          p_handle: string
          p_id: string
          p_phone: string
          p_postal_code: string
        }
        Returns: undefined
      }
      admin_enseigne: {
        Args: { p_id: string }
        Returns: {
          abonnes: number
          actor_id: string
          avatar_url: string
          avis: number
          bilans: number
          billing_interval: string
          brand_name: string
          city: string
          comped_pro_until: string
          craft_type: string
          created_at: string
          current_period_end: string
          dates: number
          discount_end: string
          discount_label: string
          fiches: number
          filleuls: number
          is_ambassador: boolean
          legal_name: string
          paid_by_name: string
          paid_by_user: string
          parrain_nom: string
          plan: string
          public_slug: string
          questions: number
          siren: string
          stripe_customer_id: string
          subscription_status: string
          trial_end: string
          type: string
        }[]
      }
      admin_enseignes: {
        Args: { p_filtre?: string; p_page?: number; p_q?: string }
        Returns: {
          actor_id: string
          avatar_url: string
          avis: number
          billing_interval: string
          brand_name: string
          city: string
          comped_pro_until: string
          created_at: string
          dates: number
          discount_label: string
          is_ambassador: boolean
          paid_by_name: string
          plan: string
          subscription_status: string
          total: number
          trial_end: string
          type: string
        }[]
      }
      admin_enseignes_de: {
        Args: { p_person: string }
        Returns: {
          avatar_url: string
          billing_interval: string
          brand_name: string
          city: string
          comped_pro_until: string
          discount_label: string
          entity_id: string
          paid_by_user: string
          plan: string
          role: string
          subscription_status: string
          trial_end: string
          type: string
        }[]
      }
      admin_filtres: {
        Args: { p_q?: string; p_vue: string }
        Returns: {
          filtre: string
          nombre: number
        }[]
      }
      admin_garde: { Args: never; Returns: undefined }
      admin_gestes: {
        Args: { p_actors: string[] }
        Returns: {
          quand: string
          quoi: string
        }[]
      }
      admin_membres: {
        Args: { p_entities: string[] }
        Returns: {
          actor_id: string
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          entity_id: string
          phone: string
          role: string
        }[]
      }
      admin_offre: {
        Args: { p_comped: string; p_plan: string; p_status: string }
        Returns: string
      }
      admin_offrir_mois: {
        Args: { p_entity: string; p_mois: number }
        Returns: string
      }
      admin_personne: {
        Args: { p_id: string }
        Returns: {
          actor_id: string
          avatar_url: string
          avis: number
          city: string
          created_at: string
          dates: number
          display_name: string
          email: string
          fiches: number
          handle: string
          last_sign_in_at: string
          phone: string
          postal_code: string
          push_muted: string[]
          questions: number
          role: string
          suspended_at: string
        }[]
      }
      admin_personnes: {
        Args: { p_filtre?: string; p_page?: number; p_q?: string }
        Returns: {
          actor_id: string
          avatar_url: string
          avis: number
          billing_interval: string
          brand_name: string
          comped_pro_until: string
          created_at: string
          dates: number
          discount_label: string
          display_name: string
          email: string
          entity_id: string
          entity_type: string
          last_sign_in_at: string
          plan: string
          role: string
          subscription_status: string
          suspended_at: string
          total: number
          trial_end: string
        }[]
      }
      admin_prospect: {
        Args: { p_id: string }
        Returns: {
          a_relancer: boolean
          activity: string
          brand: string
          city: string
          contact_channel: string
          contacted_on: string
          created_at: string
          email: string
          email_status: string
          id: string
          name: string
          note: string
          owner_id: string
          owner_name: string
          phone: string
          source: string
          unsubscribed_at: string
          user_id: string
          user_name: string
        }[]
      }
      admin_prospect_de: {
        Args: { p_user: string }
        Returns: {
          contact_channel: string
          contacted_on: string
          id: string
          linked_at: string
          linked_by: string
          source: string
        }[]
      }
      admin_prospect_expediteurs: {
        Args: never
        Returns: {
          active: boolean
          alias: string
          display_name: string
          envoyes_aujourdhui: number
          id: string
          palier: number
          signature: string
          user_id: string
          user_name: string
        }[]
      }
      admin_prospect_messages: {
        Args: { p_id: string }
        Returns: {
          at: string
          body_text: string
          delivery: string
          direction: string
          from_email: string
          has_attachments: boolean
          id: string
          message_id: string
          references_ids: string[]
          sender_name: string
          sender_user_id: string
          subject: string
          to_email: string
        }[]
      }
      admin_prospect_modeles: {
        Args: never
        Returns: {
          archived_at: string
          body: string
          envois: number
          id: string
          kind: string
          name: string
          reponses: number
          subject: string
        }[]
      }
      admin_prospects: {
        Args: {
          p_filtre?: string
          p_page?: number
          p_q?: string
          p_source?: string
          p_suivi?: string
        }
        Returns: {
          a_relancer: boolean
          activity: string
          brand: string
          city: string
          contact_channel: string
          contacted_on: string
          created_at: string
          email: string
          email_status: string
          id: string
          linked_at: string
          linked_by: string
          name: string
          note: string
          owner_id: string
          owner_name: string
          phone: string
          source: string
          total: number
          unsubscribed_at: string
          user_id: string
          user_name: string
        }[]
      }
      admin_prospects_a_rapprocher: {
        Args: never
        Returns: {
          par: string
          prospect_brand: string
          prospect_id: string
          prospect_name: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_prospects_chiffres: {
        Args: never
        Returns: {
          comptes: number
          comptes_pro: number
          contactes: number
          repondu: number
          semaine: number
          total: number
        }[]
      }
      admin_prospects_filtres: {
        Args: { p_q?: string; p_source?: string; p_suivi?: string }
        Returns: {
          filtre: string
          nombre: number
        }[]
      }
      admin_prospects_sources: {
        Args: never
        Returns: {
          source: string
        }[]
      }
      admin_rapprocher: {
        Args: { p_par: string; p_prospect: string; p_user: string }
        Returns: undefined
      }
      admin_tel: { Args: { p_q: string; p_tel: string }; Returns: boolean }
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      are_friends_of_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      attribute_referral: {
        Args: { p_code: string; p_filleul_entity_id: string }
        Returns: string
      }
      can_act_as: { Args: { target_actor: string }; Returns: boolean }
      can_use_v2: { Args: never; Returns: boolean }
      community_feed: {
        Args: { p_actor: string; p_before?: string; p_limit?: number }
        Returns: {
          comment: string
          companions: Json
          detail: string
          event_city: string
          event_department: string
          event_end: string
          event_id: string
          event_image: string
          event_name: string
          event_start: string
          event_tags: string[]
          id: string
          kind: string
          occurred_at: string
          stars: number
          target_id: string
          target_name: string
          target_slug: string
          who_avatar: string
          who_id: string
          who_name: string
          who_slug: string
        }[]
      }
      compter_avis_et_questions: {
        Args: { p_event: string }
        Returns: {
          avis: number
          questions: number
        }[]
      }
      create_owned_entity: {
        Args: {
          p_brand_name: string
          p_city?: string
          p_craft_type?: string
          p_department?: string
          p_postal_code?: string
          p_public_slug?: string
          p_type: Database["public"]["Enums"]["entity_type"]
        }
        Returns: string
      }
      crossing_dates: {
        Args: { p_actor: string }
        Returns: {
          companions: number
          event_end: string
          event_id: string
          event_image: string
          event_name: string
          event_start: string
          event_tags: string[]
          faces: Json
        }[]
      }
      department_code: { Args: { raw: string }; Returns: string }
      ensure_referral_code: {
        Args: { p_base_code: string; p_entity_id: string }
        Returns: string
      }
      events_base_slug: {
        Args: { p_city: string; p_name: string }
        Returns: string
      }
      get_coevent_suggestions: {
        Args: { p_actor_id: string }
        Returns: {
          shared_events: number
          suggested_actor: string
        }[]
      }
      get_event_reviews: {
        Args: { p_event_id: string; p_viewer_actor: string }
        Returns: {
          affluence: number
          anonymous: boolean
          author_actor_id: string
          author_avatar_url: string
          author_label: string
          author_slug: string
          comment: string
          created_at: string
          event_id: string
          identity_visible: boolean
          is_self: boolean
          organisation: number
          rentabilite: number
          review_id: string
        }[]
      }
      get_follow_suggestions: {
        Args: { p_actor_id: string }
        Returns: {
          shared_followers: number
          suggested_actor: string
        }[]
      }
      get_followers_with_dates: {
        Args: { p_actor_id: string }
        Returns: {
          followed_at: string
          follower_id: string
        }[]
      }
      get_following_with_dates: {
        Args: { p_actor_id: string }
        Returns: {
          followed_at: string
          following_id: string
        }[]
      }
      get_friend_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_friends_with_dates: {
        Args: { p_user_id: string }
        Returns: {
          friend_id: string
          friended_at: string
        }[]
      }
      get_network_follow_activity: {
        Args: { p_actor_id: string; p_since: string }
        Returns: {
          dst_actor: string
          follow_id: string
          occurred_at: string
          src_actor: string
        }[]
      }
      get_network_reviews: {
        Args: { p_actor_id: string; p_since: string }
        Returns: {
          actor_id: string
          affluence: number
          comment: string
          created_at: string
          event_id: string
          id: string
          organisation: number
          rentabilite: number
        }[]
      }
      get_referral_overview: {
        Args: { p_entity_id: string }
        Returns: {
          code: string
          is_ambassador: boolean
          pending_count: number
          rewarded_count: number
        }[]
      }
      get_review_replies: {
        Args: { p_review_id: string; p_viewer_actor: string }
        Returns: {
          author_actor_id: string
          author_avatar_url: string
          author_label: string
          author_slug: string
          body: string
          created_at: string
          identity_visible: boolean
          is_self: boolean
          reply_id: string
          review_id: string
          updated_at: string
        }[]
      }
      histoire_evenement: {
        Args: { p_event: string }
        Returns: {
          author_avatar: string
          author_brand: string
          author_name: string
          changed: string[]
          created_at: string
          id: number
          is_origin: boolean
          note: string
        }[]
      }
      identifiant_pris: { Args: { p_handle: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_entity_owner: { Args: { target_entity: string }; Returns: boolean }
      km_between: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      modifier_evenement: {
        Args: {
          p_as_entity?: string
          p_event: string
          p_expected_version?: number
          p_fields: Json
          p_note?: string
        }
        Returns: number
      }
      phone_key: { Args: { p_tel: string }; Returns: string }
      prospect_cherche: {
        Args: {
          p: Database["public"]["Tables"]["prospects"]["Row"]
          p_q: string
          p_source: string
        }
        Returns: boolean
      }
      prospect_dans_filtre: {
        Args: {
          p: Database["public"]["Tables"]["prospects"]["Row"]
          p_filtre: string
        }
        Returns: boolean
      }
      prospect_suivi: {
        Args: {
          p: Database["public"]["Tables"]["prospects"]["Row"]
          p_suivi: string
        }
        Returns: boolean
      }
      register_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      revenir_a_version_evenement: {
        Args: { p_version: number }
        Returns: number
      }
      search_similar_events: {
        Args: { search_name: string; search_year?: number; threshold?: number }
        Returns: {
          city: string
          department: string
          end_date: string
          exhibitors: number
          id: string
          image_url: string
          name: string
          score: number
          start_date: string
          tags: string[]
        }[]
      }
      send_deadline_reminders: { Args: never; Returns: number }
      send_suggestions: { Args: never; Returns: number }
      send_weekly_new_events: { Args: never; Returns: number }
      set_stand_amount: {
        Args: { p_actor_id: string; p_amount: number; p_event_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      suggestion_candidates: {
        Args: { p_actor: string }
        Returns: {
          event_id: string
          reason: Json
          score: number
          start_date: string
          strong: boolean
        }[]
      }
      suggestions_for: { Args: { p_actor: string }; Returns: Json }
      version_evenement: {
        Args: { p_version: number }
        Returns: {
          after: Json
          before: Json
          field: string
        }[]
      }
    }
    Enums: {
      actor_kind: "person" | "entity"
      entity_type: "exposant" | "festival" | "entreprise"
      membership_role: "owner" | "admin" | "member"
      note_visibility: "prive" | "amis"
      notification_type:
        | "deadline_reminder"
        | "friend_going"
        | "new_follower"
        | "friend_note"
        | "event_created"
        | "event_updated"
        | "event_image_added"
        | "event_info_added"
        | "new_exposant"
        | "review_reply"
        | "thread_reply"
        | "best_reply"
        | "thread_question"
        | "new_edition"
        | "friend_added_event"
        | "weekly_new_events"
        | "suggestion"
      participation_status:
        | "interesse"
        | "inscrit"
        | "confirme"
        | "en_cours"
        | "refuse"
      participation_visibility: "prive" | "amis" | "public"
      thread_audience: "festivalier" | "exposant" | "organisateur"
      user_plan: "free" | "pro"
      user_sex: "homme" | "femme" | "indefini"
      user_type: "exposant" | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      actor_kind: ["person", "entity"],
      entity_type: ["exposant", "festival", "entreprise"],
      membership_role: ["owner", "admin", "member"],
      note_visibility: ["prive", "amis"],
      notification_type: [
        "deadline_reminder",
        "friend_going",
        "new_follower",
        "friend_note",
        "event_created",
        "event_updated",
        "event_image_added",
        "event_info_added",
        "new_exposant",
        "review_reply",
        "thread_reply",
        "best_reply",
        "thread_question",
        "new_edition",
        "friend_added_event",
        "weekly_new_events",
        "suggestion",
      ],
      participation_status: [
        "interesse",
        "inscrit",
        "confirme",
        "en_cours",
        "refuse",
      ],
      participation_visibility: ["prive", "amis", "public"],
      thread_audience: ["festivalier", "exposant", "organisateur"],
      user_plan: ["free", "pro"],
      user_sex: ["homme", "femme", "indefini"],
      user_type: ["exposant", "public"],
    },
  },
} as const
