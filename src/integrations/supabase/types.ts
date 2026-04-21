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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          tipo_login: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          tipo_login?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          tipo_login?: string | null
          updated_at?: string
          user_id?: string
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
