// types/supabase.ts

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
      content_pillars: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: 'active' | 'live' | 'archived'
          created_at: string
          updated_at: string
          search_vector: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: 'active' | 'live' | 'archived'
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: 'active' | 'live' | 'archived'
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          id: string
          user_id: string
          name: string
          handle: string | null
          platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other'
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          handle?: string | null
          platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          handle?: string | null
          platform?: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other'
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      quick_captures: {
        Row: {
          id: string
          user_id: string
          body: string
          promoted_to: 'pillar' | 'content_piece' | null
          promoted_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          body: string
          promoted_to?: 'pillar' | 'content_piece' | null
          promoted_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          body?: string
          promoted_to?: 'pillar' | 'content_piece' | null
          promoted_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_clerk_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      content_pillar_status: 'active' | 'live' | 'archived'
      content_piece_status: 'draft' | 'ready' | 'live' | 'archived'
      schedule_entry_status: 'planned' | 'live' | 'skipped'
      research_entry_type: 'note' | 'link'
      content_piece_type: 'caption' | 'script' | 'video' | 'short_form'
      platform_type: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other'
      asset_file_type: 'image' | 'pdf' | 'video' | 'external_link'
      promoted_target_type: 'pillar' | 'content_piece'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
