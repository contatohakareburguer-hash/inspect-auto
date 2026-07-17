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
      admin_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          scope: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          scope: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          scope?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      danos_detectados: {
        Row: {
          angulo: string | null
          bounding_box: Json | null
          confianca: number | null
          created_at: string
          descricao: string | null
          foto_id: string | null
          id: string
          inspecao_id: string
          item_id: string | null
          localizacao: string | null
          severidade: string
          tipo: string
          user_id: string
        }
        Insert: {
          angulo?: string | null
          bounding_box?: Json | null
          confianca?: number | null
          created_at?: string
          descricao?: string | null
          foto_id?: string | null
          id?: string
          inspecao_id: string
          item_id?: string | null
          localizacao?: string | null
          severidade: string
          tipo: string
          user_id: string
        }
        Update: {
          angulo?: string | null
          bounding_box?: Json | null
          confianca?: number | null
          created_at?: string
          descricao?: string | null
          foto_id?: string | null
          id?: string
          inspecao_id?: string
          item_id?: string | null
          localizacao?: string | null
          severidade?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "danos_detectados_foto_id_fkey"
            columns: ["foto_id"]
            isOneToOne: false
            referencedRelation: "fotos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danos_detectados_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danos_detectados_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          analisada_em: string | null
          angulo: string | null
          created_at: string
          id: string
          inspecao_id: string
          item_id: string | null
          legenda: string | null
          ordem: number
          storage_path: string
          url: string
          user_id: string
        }
        Insert: {
          analisada_em?: string | null
          angulo?: string | null
          created_at?: string
          id?: string
          inspecao_id: string
          item_id?: string | null
          legenda?: string | null
          ordem?: number
          storage_path: string
          url: string
          user_id: string
        }
        Update: {
          analisada_em?: string | null
          angulo?: string | null
          created_at?: string
          id?: string
          inspecao_id?: string
          item_id?: string | null
          legenda?: string | null
          ordem?: number
          storage_path?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecoes: {
        Row: {
          ano: number | null
          assinatura_cliente: string | null
          assinatura_vistoriador: string | null
          classificacao_final: string | null
          conclusao: string | null
          cor: string | null
          created_at: string
          finalizada_em: string | null
          id: string
          km: number | null
          marca: string | null
          modelo: string | null
          nome_cliente: string | null
          nome_veiculo: string
          observacoes_gerais: string | null
          placa: string
          preco_pedido: number | null
          score_total: number
          status: string
          tipo_veiculo: string
          updated_at: string
          user_id: string
          vendedor: string | null
        }
        Insert: {
          ano?: number | null
          assinatura_cliente?: string | null
          assinatura_vistoriador?: string | null
          classificacao_final?: string | null
          conclusao?: string | null
          cor?: string | null
          created_at?: string
          finalizada_em?: string | null
          id?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          nome_cliente?: string | null
          nome_veiculo?: string
          observacoes_gerais?: string | null
          placa?: string
          preco_pedido?: number | null
          score_total?: number
          status?: string
          tipo_veiculo?: string
          updated_at?: string
          user_id: string
          vendedor?: string | null
        }
        Update: {
          ano?: number | null
          assinatura_cliente?: string | null
          assinatura_vistoriador?: string | null
          classificacao_final?: string | null
          conclusao?: string | null
          cor?: string | null
          created_at?: string
          finalizada_em?: string | null
          id?: string
          km?: number | null
          marca?: string | null
          modelo?: string | null
          nome_cliente?: string | null
          nome_veiculo?: string
          observacoes_gerais?: string | null
          placa?: string
          preco_pedido?: number | null
          score_total?: number
          status?: string
          tipo_veiculo?: string
          updated_at?: string
          user_id?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      itens_checklist: {
        Row: {
          categoria: string
          created_at: string
          id: string
          inspecao_id: string
          item_key: string
          item_nome: string
          observacao_usuario: string | null
          ordem: number
          status: string | null
          sugestao_sistema: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          inspecao_id: string
          item_key: string
          item_nome: string
          observacao_usuario?: string | null
          ordem?: number
          status?: string | null
          sugestao_sistema?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          inspecao_id?: string
          item_key?: string
          item_nome?: string
          observacao_usuario?: string | null
          ordem?: number
          status?: string | null
          sugestao_sistema?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_checklist_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "inspecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          error: string | null
          id: string
          model: string | null
          parts: Json | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          parts?: Json | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          parts?: Json | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blocked_reason: string | null
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean
          nome: string | null
          plan: string
          tema: string
          tipo_login: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          nome?: string | null
          plan?: string
          tema?: string
          tipo_login?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          nome?: string | null
          plan?: string
          tema?: string
          tipo_login?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string | null
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          kind: string
          model: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind: string
          model?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          model?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
