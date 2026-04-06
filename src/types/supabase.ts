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
      event_reports: {
        Row: {
          booth_cost: number | null
          charges: number | null
          created_at: string
          event_id: string
          id: string
          improvements: string[] | null
          revenue: number | null
          user_id: string
          wins: string[] | null
        }
        Insert: {
          booth_cost?: number | null
          charges?: number | null
          created_at?: string
          event_id: string
          id?: string
          improvements?: string[] | null
          revenue?: number | null
          user_id: string
          wins?: string[] | null
        }
        Update: {
          booth_cost?: number | null
          charges?: number | null
          created_at?: string
          event_id?: string
          id?: string
          improvements?: string[] | null
          revenue?: number | null
          user_id?: string
          wins?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          end_date: string
          external_url: string | null
          id: string
          image_url: string | null
          name: string
          primary_tag: string
          registration_deadline: string | null
          registration_note: string | null
          registration_url: string | null
          start_date: string
          tags: string[] | null
        }
        Insert: {
          city: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          department: string
          description?: string | null
          end_date: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          primary_tag: string
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          start_date: string
          tags?: string[] | null
        }
        Update: {
          city?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          end_date?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          primary_tag?: string
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          start_date?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payments: { amount: number; date: string; label: string }[] | null
          status: Database["public"]["Enums"]["participation_status"]
          total_cost: number | null
          user_id: string
          visibility: Database["public"]["Enums"]["participation_visibility"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payments?: { amount: number; date: string; label: string }[] | null
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          user_id: string
          visibility?: Database["public"]["Enums"]["participation_visibility"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payments?: { amount: number; date: string; label: string }[] | null
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["participation_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          brand_name: string | null
          city: string | null
          craft_type: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          postal_code: string | null
          public_slug: string | null
          sex: Database["public"]["Enums"]["user_sex"] | null
          type: Database["public"]["Enums"]["user_type"]
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_name?: string | null
          city?: string | null
          craft_type?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email: string
          id: string
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          public_slug?: string | null
          sex?: Database["public"]["Enums"]["user_sex"] | null
          type?: Database["public"]["Enums"]["user_type"]
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_name?: string | null
          city?: string | null
          craft_type?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          public_slug?: string | null
          sex?: Database["public"]["Enums"]["user_sex"] | null
          type?: Database["public"]["Enums"]["user_type"]
          website?: string | null
        }
        Relationships: []
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          affluence: number
          comment: string | null
          created_at: string
          event_id: string
          id: string
          organisation: number
          rentabilite: number
          user_id: string
        }
        Insert: {
          affluence: number
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          organisation: number
          rentabilite: number
          user_id: string
        }
        Update: {
          affluence?: number
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          organisation?: number
          rentabilite?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      are_friends_of_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      get_friend_ids: { Args: { p_user_id: string }; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
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
      participation_status: "interesse" | "en_cours" | "inscrit"
      participation_visibility: "prive" | "amis" | "public"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      ],
      participation_status: ["interesse", "en_cours", "inscrit"],
      participation_visibility: ["prive", "amis", "public"],
      user_plan: ["free", "pro"],
      user_sex: ["homme", "femme", "indefini"],
      user_type: ["exposant", "public"],
    },
  },
} as const
