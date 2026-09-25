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
      admin_batch_assignments: {
        Row: {
          admin_id: string
          batch_id: string
          created_at: string
          id: string
        }
        Insert: {
          admin_id: string
          batch_id: string
          created_at?: string
          id?: string
        }
        Update: {
          admin_id?: string
          batch_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_batch_assignments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_batch_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level: number
          mid_break_end: string | null
          mid_break_start: string | null
          name: string
          start_date: string
          term: number
          total_weeks: number
          updated_at: string
          vacant_weeks: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level: number
          mid_break_end?: string | null
          mid_break_start?: string | null
          name: string
          start_date: string
          term: number
          total_weeks?: number
          updated_at?: string
          vacant_weeks?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          mid_break_end?: string | null
          mid_break_start?: string | null
          name?: string
          start_date?: string
          term?: number
          total_weeks?: number
          updated_at?: string
          vacant_weeks?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          color: string
          created_at: string
          credit: number | null
          id: string
          level: number | null
          name: string
          term: number | null
          type: Database["public"]["Enums"]["course_type"]
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          credit?: number | null
          id?: string
          level?: number | null
          name: string
          term?: number | null
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          credit?: number | null
          id?: string
          level?: number | null
          name?: string
          term?: number | null
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Relationships: []
      }
      dismissed_holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      display_settings: {
        Row: {
          created_at: string
          id: number
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          is_national: boolean
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_national?: boolean
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_national?: boolean
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          building: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          batch_id: string
          course_id: string | null
          created_at: string
          day: string
          group_name: string | null
          id: string
          room_id: string | null
          slot_index: number
          slot_position: number
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          course_id?: string | null
          created_at?: string
          day: string
          group_name?: string | null
          id?: string
          room_id?: string | null
          slot_index: number
          slot_position?: number
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          course_id?: string | null
          created_at?: string
          day?: string
          group_name?: string | null
          id?: string
          room_id?: string | null
          slot_index?: number
          slot_position?: number
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          short_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          short_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_settings: {
        Row: {
          created_at: string
          custom_slots: Json
          id: string
          updated_at: string
          use_custom: boolean
        }
        Insert: {
          created_at?: string
          custom_slots?: Json
          id?: string
          updated_at?: string
          use_custom?: boolean
        }
        Update: {
          created_at?: string
          custom_slots?: Json
          id?: string
          updated_at?: string
          use_custom?: boolean
        }
        Relationships: []
      }
      weekly_class_tests: {
        Row: {
          batch_id: string
          course_id: string
          created_at: string
          ct_number: string
          day: string | null
          description: string | null
          id: string
          kind: string
          slot_index: number | null
          updated_at: string
          week_start: string
        }
        Insert: {
          batch_id: string
          course_id: string
          created_at?: string
          ct_number: string
          day?: string | null
          description?: string | null
          id?: string
          kind?: string
          slot_index?: number | null
          updated_at?: string
          week_start: string
        }
        Update: {
          batch_id?: string
          course_id?: string
          created_at?: string
          ct_number?: string
          day?: string | null
          description?: string | null
          id?: string
          kind?: string
          slot_index?: number | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_class_tests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_class_tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_modifications: {
        Row: {
          action: string
          batch_id: string
          created_at: string
          id: string
          source_day: string
          source_slot_id: string | null
          source_slot_index: number
          source_slot_position: number
          target_day: string | null
          target_room_id: string | null
          target_slot_index: number | null
          target_slot_position: number | null
          updated_at: string
          week_start: string
        }
        Insert: {
          action: string
          batch_id: string
          created_at?: string
          id?: string
          source_day: string
          source_slot_id?: string | null
          source_slot_index: number
          source_slot_position?: number
          target_day?: string | null
          target_room_id?: string | null
          target_slot_index?: number | null
          target_slot_position?: number | null
          updated_at?: string
          week_start: string
        }
        Update: {
          action?: string
          batch_id?: string
          created_at?: string
          id?: string
          source_day?: string
          source_slot_id?: string | null
          source_slot_index?: number
          source_slot_position?: number
          target_day?: string | null
          target_room_id?: string | null
          target_slot_index?: number | null
          target_slot_position?: number | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_modifications_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_modifications_source_slot_id_fkey"
            columns: ["source_slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_modifications_target_room_id_fkey"
            columns: ["target_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      course_type: "theory" | "sessional"
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
      course_type: ["theory", "sessional"],
    },
  },
} as const
