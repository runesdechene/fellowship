export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      entities: {
        Row: {
          actor_id: string
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          brand_name: string
          city: string | null
          craft_type: string | null
          created_at: string
          department: string | null
          postal_code: string | null
          public_slug: string | null
          type: Database["public"]["Enums"]["entity_type"]
          website: string | null
        }
        Insert: {
          actor_id: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_name: string
          city?: string | null
          craft_type?: string | null
          created_at?: string
          department?: string | null
          postal_code?: string | null
          public_slug?: string | null
          type: Database["public"]["Enums"]["entity_type"]
          website?: string | null
        }
        Update: {
          actor_id?: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_name?: string
          city?: string | null
          craft_type?: string | null
          created_at?: string
          department?: string | null
          postal_code?: string | null
          public_slug?: string | null
          type?: Database["public"]["Enums"]["entity_type"]
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
        ]
      }
      event_reports: {
        Row: {
          acted_by_user_id: string | null
          actor_id: string | null
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
          acted_by_user_id?: string | null
          actor_id?: string | null
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
          acted_by_user_id?: string | null
          actor_id?: string | null
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
          acted_by_user_id: string | null
          city: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          created_by_actor: string | null
          department: string
          description: string | null
          end_date: string
          external_url: string | null
          id: string
          image_url: string | null
          name: string
          registration_deadline: string | null
          registration_note: string | null
          registration_url: string | null
          start_date: string
          tags: string[] | null
        }
        Insert: {
          acted_by_user_id?: string | null
          city: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          created_by_actor?: string | null
          department: string
          description?: string | null
          end_date: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
          start_date: string
          tags?: string[] | null
        }
        Update: {
          acted_by_user_id?: string | null
          city?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          created_by_actor?: string | null
          department?: string
          description?: string | null
          end_date?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          registration_deadline?: string | null
          registration_note?: string | null
          registration_url?: string | null
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
          follower_actor: string | null
          follower_id: string
          following_actor: string | null
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_actor?: string | null
          follower_id: string
          following_actor?: string | null
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_actor?: string | null
          follower_id?: string
          following_actor?: string | null
          following_id?: string
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
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_actor_fkey"
            columns: ["following_actor"]
            isOneToOne: false
            referencedRelation: "actors"
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
          actor_id: string | null
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id?: string | null
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string | null
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
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
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
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
          acted_by_user_id: string | null
          actor_id: string | null
          created_at: string
          event_id: string
          id: string
          payment_status: string | null
          payments: Json | null
          status: Database["public"]["Enums"]["participation_status"]
          total_cost: number | null
          user_id: string
          visibility: Database["public"]["Enums"]["participation_visibility"]
        }
        Insert: {
          acted_by_user_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          payment_status?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          user_id: string
          visibility?: Database["public"]["Enums"]["participation_visibility"]
        }
        Update: {
          acted_by_user_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          payment_status?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["participation_status"]
          total_cost?: number | null
          user_id?: string
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
          role: string
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
          role?: string
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
          role?: string
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
          acted_by_user_id: string | null
          actor_id: string | null
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
          acted_by_user_id?: string | null
          actor_id?: string | null
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
          acted_by_user_id?: string | null
          actor_id?: string | null
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
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          plan: Database["public"]["Enums"]["user_plan"]
          postal_code: string | null
          role: string
          sex: Database["public"]["Enums"]["user_sex"] | null
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
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          role?: string
          sex?: Database["public"]["Enums"]["user_sex"] | null
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
          plan?: Database["public"]["Enums"]["user_plan"]
          postal_code?: string | null
          role?: string
          sex?: Database["public"]["Enums"]["user_sex"] | null
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
      can_act_as: { Args: { target_actor: string }; Returns: boolean }
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
      get_friend_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_friends_with_dates: {
        Args: { p_user_id: string }
        Returns: {
          friend_id: string
          friended_at: string
        }[]
      }
      is_entity_owner: { Args: { target_entity: string }; Returns: boolean }
      search_similar_events: {
        Args: { search_name: string; search_year?: number; threshold?: number }
        Returns: {
          city: string
          department: string
          end_date: string
          id: string
          name: string
          score: number
          start_date: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
      participation_status: "interesse" | "inscrit" | "confirme" | "en_cours"
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
  graphql_public: {
    Enums: {},
  },
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
      ],
      participation_status: ["interesse", "inscrit", "confirme", "en_cours"],
      participation_visibility: ["prive", "amis", "public"],
      user_plan: ["free", "pro"],
      user_sex: ["homme", "femme", "indefini"],
      user_type: ["exposant", "public"],
    },
  },
} as const

