// Database type definitions for Supabase
// Run `npx supabase gen types typescript` after schema setup to auto-generate this

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Relationships: []
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          currency: string
          locale: string
          opening_balance_minor: number
          theme: string
          onboarding_complete: boolean
          ai_consent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          locale?: string
          opening_balance_minor?: number
          theme?: string
          onboarding_complete?: boolean
          ai_consent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          locale?: string
          opening_balance_minor?: number
          theme?: string
          onboarding_complete?: boolean
          ai_consent?: boolean
          updated_at?: string
        }
      }
      categories: {
        Relationships: []
        Row: {
          id: string
          user_id: string | null
          name: string
          icon: string
          color: string
          type: string
          budget_minor: number | null
          is_archived: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          icon: string
          color: string
          type: string
          budget_minor?: number | null
          is_archived?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          icon?: string
          color?: string
          type?: string
          budget_minor?: number | null
          is_archived?: boolean
          sort_order?: number
        }
      }
      transactions: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          amount_minor: number
          type: string
          category_id: string | null
          date: string
          time: string
          merchant: string
          description: string
          payment_method: string
          tags: string[]
          notes: string | null
          receipt_url: string | null
          is_recurring: boolean
          recurring_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_minor: number
          type: string
          category_id?: string | null
          date: string
          time?: string
          merchant?: string
          description?: string
          payment_method?: string
          tags?: string[]
          notes?: string | null
          receipt_url?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          type?: string
          category_id?: string | null
          date?: string
          time?: string
          merchant?: string
          description?: string
          payment_method?: string
          tags?: string[]
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
      }
      budgets: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          period: string
          total_minor: number
          start_date: string
          end_date: string | null
          warn_threshold_pct: number
          alert_threshold_pct: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period?: string
          total_minor: number
          start_date: string
          end_date?: string | null
          warn_threshold_pct?: number
          alert_threshold_pct?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          period?: string
          total_minor?: number
          start_date?: string
          end_date?: string | null
          warn_threshold_pct?: number
          alert_threshold_pct?: number
          updated_at?: string
        }
      }
      savings_goals: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          target_minor: number
          current_minor: number
          target_date: string | null
          monthly_contribution_minor: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          color?: string
          target_minor: number
          current_minor?: number
          target_date?: string | null
          monthly_contribution_minor?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          icon?: string
          color?: string
          target_minor?: number
          current_minor?: number
          target_date?: string | null
          monthly_contribution_minor?: number | null
          updated_at?: string
        }
      }
      recurring_transactions: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          amount_minor: number
          type: string
          category_id: string | null
          merchant: string
          description: string
          payment_method: string
          frequency: string
          start_date: string
          end_date: string | null
          next_due_date: string
          is_active: boolean
          last_generated_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_minor: number
          type: string
          category_id?: string | null
          merchant?: string
          description?: string
          payment_method?: string
          frequency: string
          start_date: string
          end_date?: string | null
          next_due_date: string
          is_active?: boolean
          last_generated_date?: string | null
          created_at?: string
        }
        Update: {
          amount_minor?: number
          type?: string
          category_id?: string | null
          merchant?: string
          description?: string
          payment_method?: string
          frequency?: string
          end_date?: string | null
          next_due_date?: string
          is_active?: boolean
          last_generated_date?: string | null
        }
      }
      ai_insights: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          category_id: string | null
          supporting_data: Json | null
          dismissed: boolean
          helpful: boolean | null
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          type?: string
          category_id?: string | null
          supporting_data?: Json | null
          dismissed?: boolean
          helpful?: boolean | null
          generated_at?: string
        }
        Update: {
          dismissed?: boolean
          helpful?: boolean | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
