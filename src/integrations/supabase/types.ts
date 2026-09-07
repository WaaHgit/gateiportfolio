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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agreement_confirmed: boolean
          calendar_event_id: string | null
          created_at: string
          description: string
          email: string
          event_date: string | null
          event_time: string | null
          full_name: string
          id: string
          internal_notes: string | null
          latitude: number | null
          longitude: number | null
          phone: string
          preferred_date: string | null
          service: string
          status: string
          venue: string | null
        }
        Insert: {
          agreement_confirmed?: boolean
          calendar_event_id?: string | null
          created_at?: string
          description: string
          email: string
          event_date?: string | null
          event_time?: string | null
          full_name: string
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          phone: string
          preferred_date?: string | null
          service: string
          status?: string
          venue?: string | null
        }
        Update: {
          agreement_confirmed?: boolean
          calendar_event_id?: string | null
          created_at?: string
          description?: string
          email?: string
          event_date?: string | null
          event_time?: string | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string
          preferred_date?: string | null
          service?: string
          status?: string
          venue?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      page_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          path: string | null
          platform: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          path?: string | null
          platform?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          path?: string | null
          platform?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category: Database["public"]["Enums"]["media_category"]
          created_at: string
          description: string | null
          file_url: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          sort_order: number
          status: string
          storage_path: string
          title: string | null
          type: Database["public"]["Enums"]["media_type"]
        }
        Insert: {
          category: Database["public"]["Enums"]["media_category"]
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: string
          storage_path: string
          title?: string | null
          type: Database["public"]["Enums"]["media_type"]
        }
        Update: {
          category?: Database["public"]["Enums"]["media_category"]
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: string
          storage_path?: string
          title?: string | null
          type?: Database["public"]["Enums"]["media_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved_at: string | null
          archived_at: string | null
          client_name: string
          created_at: string
          edit_count: number
          edit_token: string | null
          edit_token_expires_at: string | null
          email: string
          id: string
          is_edited: boolean
          rating: number
          review_text: string
          status: Database["public"]["Enums"]["review_status"]
          status_history: Json
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          archived_at?: string | null
          client_name: string
          created_at?: string
          edit_count?: number
          edit_token?: string | null
          edit_token_expires_at?: string | null
          email: string
          id?: string
          is_edited?: boolean
          rating: number
          review_text: string
          status?: Database["public"]["Enums"]["review_status"]
          status_history?: Json
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          archived_at?: string | null
          client_name?: string
          created_at?: string
          edit_count?: number
          edit_token?: string | null
          edit_token_expires_at?: string | null
          email?: string
          id?: string
          is_edited?: boolean
          rating?: number
          review_text?: string
          status?: Database["public"]["Enums"]["review_status"]
          status_history?: Json
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          id: string
          is_visible: boolean
          label: string
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          id?: string
          is_visible?: boolean
          label: string
          platform: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Update: {
          id?: string
          is_visible?: boolean
          label?: string
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      reviews_public: {
        Row: {
          approved_at: string | null
          client_name: string | null
          created_at: string | null
          id: string | null
          is_edited: boolean | null
          rating: number | null
          review_text: string | null
        }
        Insert: {
          approved_at?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string | null
          is_edited?: boolean | null
          rating?: number | null
          review_text?: string | null
        }
        Update: {
          approved_at?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string | null
          is_edited?: boolean | null
          rating?: number | null
          review_text?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
      media_category: "audio" | "video" | "graphics" | "photography"
      media_type: "image" | "video" | "audio"
      review_status: "pending" | "live" | "archived"
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
      app_role: ["admin", "user"],
      media_category: ["audio", "video", "graphics", "photography"],
      media_type: ["image", "video", "audio"],
      review_status: ["pending", "live", "archived"],
    },
  },
} as const
