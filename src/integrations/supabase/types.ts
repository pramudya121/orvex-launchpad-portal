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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chain_sync: {
        Row: {
          factory_cursor: number
          id: string
          last_block: number
          lease_id: string | null
          lease_until: string | null
          updated_at: string
        }
        Insert: {
          factory_cursor?: number
          id: string
          last_block?: number
          lease_id?: string | null
          lease_until?: string | null
          updated_at?: string
        }
        Update: {
          factory_cursor?: number
          id?: string
          last_block?: number
          lease_id?: string | null
          lease_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faucet_quest_completions: {
        Row: {
          id: string
          quest_id: string
          verified_at: string
          wallet: string
        }
        Insert: {
          id?: string
          quest_id: string
          verified_at?: string
          wallet: string
        }
        Update: {
          id?: string
          quest_id?: string
          verified_at?: string
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "faucet_quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "faucet_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      faucet_quests: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          kind: string
          position: number
          target: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          position?: number
          target: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          position?: number
          target?: string
          title?: string
        }
        Relationships: []
      }
      token_trades: {
        Row: {
          base_amount: number
          block_hash: string | null
          block_number: number | null
          created_at: string
          id: string
          log_index: number
          price: number
          side: string
          token_amount: number
          token_id: string
          trader: string
          tx_hash: string | null
        }
        Insert: {
          base_amount: number
          block_hash?: string | null
          block_number?: number | null
          created_at?: string
          id?: string
          log_index?: number
          price: number
          side: string
          token_amount: number
          token_id: string
          trader: string
          tx_hash?: string | null
        }
        Update: {
          base_amount?: number
          block_hash?: string | null
          block_number?: number | null
          created_at?: string
          id?: string
          log_index?: number
          price?: number
          side?: string
          token_amount?: number
          token_id?: string
          trader?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_trades_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          address: string
          created_at: string
          creator: string
          curve_address: string | null
          description: string
          fee_bps: number
          graduated: boolean
          id: string
          launch_block: number | null
          logo_url: string | null
          max_buy: number | null
          name: string
          onchain: boolean
          pair_address: string | null
          real_base: number
          sale_supply: number
          symbol: string
          synced_block: number
          telegram: string | null
          tokens_sold: number
          total_supply: number
          twitter: string | null
          virtual_base: number
          virtual_token: number
          website: string | null
        }
        Insert: {
          address: string
          created_at?: string
          creator: string
          curve_address?: string | null
          description?: string
          fee_bps?: number
          graduated?: boolean
          id?: string
          launch_block?: number | null
          logo_url?: string | null
          max_buy?: number | null
          name: string
          onchain?: boolean
          pair_address?: string | null
          real_base?: number
          sale_supply?: number
          symbol: string
          synced_block?: number
          telegram?: string | null
          tokens_sold?: number
          total_supply?: number
          twitter?: string | null
          virtual_base?: number
          virtual_token?: number
          website?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          creator?: string
          curve_address?: string | null
          description?: string
          fee_bps?: number
          graduated?: boolean
          id?: string
          launch_block?: number | null
          logo_url?: string | null
          max_buy?: number | null
          name?: string
          onchain?: boolean
          pair_address?: string | null
          real_base?: number
          sale_supply?: number
          symbol?: string
          synced_block?: number
          telegram?: string | null
          tokens_sold?: number
          total_supply?: number
          twitter?: string | null
          virtual_base?: number
          virtual_token?: number
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_chain_sync_lease: {
        Args: { force_sync?: boolean; owner_id: string }
        Returns: boolean
      }
      release_chain_sync_lease: {
        Args: { completed_block?: number; owner_id: string }
        Returns: undefined
      }
      token_market_all_stats: {
        Args: { token_ids: string[] }
        Returns: {
          first_price_all: number
          token_id: string
          trades_all: number
          volume_all: number
        }[]
      }
      token_market_short_stats: {
        Args: { token_ids: string[] }
        Returns: {
          first_price_1h: number
          first_price_6h: number
          token_id: string
          trades_1h: number
          trades_6h: number
          volume_1h: number
          volume_6h: number
        }[]
      }
      token_market_stats: {
        Args: { token_ids: string[] }
        Returns: {
          first_price_24h: number
          first_price_7d: number
          holders: number
          token_id: string
          trades_24h: number
          trades_7d: number
          volume_24h: number
          volume_7d: number
        }[]
      }
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
    Enums: {},
  },
} as const
