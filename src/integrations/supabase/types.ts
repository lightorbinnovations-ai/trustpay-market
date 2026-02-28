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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          expires_at: string | null
          id: string
          image_path: string | null
          link_url: string | null
          owner_telegram_id: number
          stars_paid: number
          starts_at: string | null
          status: string
          title: string
          video_path: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          image_path?: string | null
          link_url?: string | null
          owner_telegram_id: number
          stars_paid?: number
          starts_at?: string | null
          status?: string
          title: string
          video_path?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          image_path?: string | null
          link_url?: string | null
          owner_telegram_id?: number
          stars_paid?: number
          starts_at?: string | null
          status?: string
          title?: string
          video_path?: string | null
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          country: string | null
          created_at: string
          first_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          telegram_id: number
          username: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          telegram_id: number
          username?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          telegram_id?: number
          username?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          telegram_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          telegram_id: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          boosted_until: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          price: number | null
          seller_telegram_id: number
          status: string
          title: string
          type: string
        }
        Insert: {
          boosted_until?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number | null
          seller_telegram_id: number
          status?: string
          title: string
          type: string
        }
        Update: {
          boosted_until?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number | null
          seller_telegram_id?: number
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_telegram_id_fkey"
            columns: ["seller_telegram_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          listing_id: string | null
          message: string
          recipient_telegram_id: number
          sender_telegram_id: number | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message: string
          recipient_telegram_id: number
          sender_telegram_id?: number | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message?: string
          recipient_telegram_id?: number
          sender_telegram_id?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewer_telegram_id: number
          seller_telegram_id: number
          transaction_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewer_telegram_id: number
          seller_telegram_id: number
          transaction_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewer_telegram_id?: number
          seller_telegram_id?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_telegram_id_fkey"
            columns: ["reviewer_telegram_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "reviews_seller_telegram_id_fkey"
            columns: ["seller_telegram_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "reviews_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          boost_listing_id: string | null
          buyer_telegram_id: number
          created_at: string
          id: string
          listing_id: string | null
          seller_telegram_id: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          boost_listing_id?: string | null
          buyer_telegram_id: number
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_telegram_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          boost_listing_id?: string | null
          buyer_telegram_id?: number
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_telegram_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_boost_listing_id_fkey"
            columns: ["boost_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_telegram_id_fkey"
            columns: ["buyer_telegram_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_telegram_id_fkey"
            columns: ["seller_telegram_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["telegram_id"]
          },
        ]
      }
      verified_sellers: {
        Row: {
          auto_renew: boolean
          created_at: string
          expires_at: string
          id: string
          stars_paid: number
          starts_at: string
          telegram_id: number
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expires_at: string
          id?: string
          stars_paid?: number
          starts_at?: string
          telegram_id: number
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          stars_paid?: number
          starts_at?: string
          telegram_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
