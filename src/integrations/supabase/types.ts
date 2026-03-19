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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          api_key: string
          enabled: boolean
          id: string
          model: string
          provider: string
          script_model: string
          updated_at: string
          voice_model: string
        }
        Insert: {
          api_key?: string
          enabled?: boolean
          id?: string
          model?: string
          provider?: string
          script_model?: string
          updated_at?: string
          voice_model?: string
        }
        Update: {
          api_key?: string
          enabled?: boolean
          id?: string
          model?: string
          provider?: string
          script_model?: string
          updated_at?: string
          voice_model?: string
        }
        Relationships: []
      }
      daily_token_cap: {
        Row: {
          daily_limit: number
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      elevenlabs_settings: {
        Row: {
          api_key: string
          enabled: boolean
          id: string
          updated_at: string
          voice_id: string
          voice_name: string
        }
        Insert: {
          api_key?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          voice_id?: string
          voice_name?: string
        }
        Update: {
          api_key?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      global_usage_cap: {
        Row: {
          daily_limit: number
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_generation_cap: {
        Row: {
          daily_limit: number
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lipsync_settings: {
        Row: {
          did_api_key: string
          enabled: boolean
          heygen_api_key: string
          id: string
          provider: string
          updated_at: string
        }
        Insert: {
          did_api_key?: string
          enabled?: boolean
          heygen_api_key?: string
          id?: string
          provider?: string
          updated_at?: string
        }
        Update: {
          did_api_key?: string
          enabled?: boolean
          heygen_api_key?: string
          id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      script_generation_cap: {
        Row: {
          daily_limit: number
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          daily_limit: number
          id: string
          limit_type: string
          section: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          id?: string
          limit_type?: string
          section: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          id?: string
          limit_type?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_log: {
        Row: {
          id: string
          section: string
          tokens_used: number | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          section: string
          tokens_used?: number | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          section?: string
          tokens_used?: number | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_usage_limits: {
        Row: {
          custom_limit: number
          id: string
          limit_type: string
          section: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_limit?: number
          id?: string
          limit_type?: string
          section: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_limit?: number
          id?: string
          limit_type?: string
          section?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_generation_cap: {
        Row: {
          daily_limit: number
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      watermark_settings: {
        Row: {
          color: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
