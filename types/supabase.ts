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
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: 'amway' | 'vera'
          category: string | null
          numeric_sku: string | null
          price: number | null
          wholesale_price: number | null
          currency: string | null
          pv: number | null
          description: string | null
          image_url: string | null
          source_url: string | null
          amway_brand: string | null
          source: 'amway-price-checker' | 'manual'
          active: boolean
          sync_locked: boolean
          last_synced_at: string | null
          created_at: string
          search_vector: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand: 'amway' | 'vera'
          category?: string | null
          numeric_sku?: string | null
          price?: number | null
          wholesale_price?: number | null
          currency?: string | null
          pv?: number | null
          description?: string | null
          image_url?: string | null
          source_url?: string | null
          amway_brand?: string | null
          source: 'amway-price-checker' | 'manual'
          active?: boolean
          sync_locked?: boolean
          last_synced_at?: string | null
          created_at?: string
          search_vector?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: 'amway' | 'vera'
          category?: string | null
          numeric_sku?: string | null
          price?: number | null
          wholesale_price?: number | null
          currency?: string | null
          pv?: number | null
          description?: string | null
          image_url?: string | null
          source_url?: string | null
          amway_brand?: string | null
          source?: 'amway-price-checker' | 'manual'
          active?: boolean
          sync_locked?: boolean
          last_synced_at?: string | null
          created_at?: string
          search_vector?: string | null
        }
        Relationships: []
      }
      pillar_products: {
        Row: {
          pillar_id: string
          product_id: string
          user_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          pillar_id: string
          product_id: string
          user_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          pillar_id?: string
          product_id?: string
          user_id?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillar_products_pillar_id_fkey"
            columns: ["pillar_id"]
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      research_entries: {
        Row: {
          id: string
          user_id: string
          pillar_id: string
          type: 'note' | 'link'
          title: string | null
          body: string | null
          url: string | null
          pinned: boolean
          created_at: string
          updated_at: string
          search_vector: string | null
        }
        Insert: {
          id?: string
          user_id: string
          pillar_id: string
          type: 'note' | 'link'
          title?: string | null
          body?: string | null
          url?: string | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          pillar_id?: string
          type?: 'note' | 'link'
          title?: string | null
          body?: string | null
          url?: string | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_entries_pillar_id_fkey"
            columns: ["pillar_id"]
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          }
        ]
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
      content_pieces: {
        Row: {
          id: string
          user_id: string
          title: string
          type: 'caption' | 'script' | 'video' | 'short_form'
          body: string | null
          status: 'draft' | 'ready' | 'live' | 'archived' | 'scheduled'
          published_at: string | null
          created_at: string
          updated_at: string
          search_vector: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          type: 'caption' | 'script' | 'video' | 'short_form'
          body?: string | null
          status?: 'draft' | 'ready' | 'live' | 'archived' | 'scheduled'
          published_at?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: 'caption' | 'script' | 'video' | 'short_form'
          body?: string | null
          status?: 'draft' | 'ready' | 'live' | 'archived' | 'scheduled'
          published_at?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: string | null
        }
        Relationships: []
      }
      pillar_content: {
        Row: {
          pillar_id: string
          piece_id: string
          user_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          pillar_id: string
          piece_id: string
          user_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          pillar_id?: string
          piece_id?: string
          user_id?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillar_content_pillar_id_fkey"
            columns: ["pillar_id"]
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_content_piece_id_fkey"
            columns: ["piece_id"]
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: {
          id: string
          user_id: string
          research_entry_id: string | null
          content_piece_id: string | null
          file_type: 'image' | 'pdf' | 'video' | 'external_link'
          storage_path: string | null
          url: string | null
          file_name: string | null
          file_size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          research_entry_id?: string | null
          content_piece_id?: string | null
          file_type: 'image' | 'pdf' | 'video' | 'external_link'
          storage_path?: string | null
          url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          research_entry_id?: string | null
          content_piece_id?: string | null
          file_type?: 'image' | 'pdf' | 'video' | 'external_link'
          storage_path?: string | null
          url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_research_entry_id_fkey"
            columns: ["research_entry_id"]
            referencedRelation: "research_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_content_piece_id_fkey"
            columns: ["content_piece_id"]
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          }
        ]
      }
      schedule_entries: {
        Row: {
          id: string
          user_id: string
          content_piece_id: string
          channel_id: string
          planned_at: string
          published_at: string | null
          status: 'planned' | 'live' | 'skipped'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_piece_id: string
          channel_id: string
          planned_at: string
          published_at?: string | null
          status?: 'planned' | 'live' | 'skipped'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_piece_id?: string
          channel_id?: string
          planned_at?: string
          published_at?: string | null
          status?: 'planned' | 'live' | 'skipped'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_content_piece_id_fkey"
            columns: ["content_piece_id"]
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_channel_id_fkey"
            columns: ["channel_id"]
            referencedRelation: "channels"
            referencedColumns: ["id"]
          }
        ]
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
      try_acquire_sync_lock: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      release_sync_lock: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      content_pillar_status: 'active' | 'live' | 'archived'
      content_piece_status: 'draft' | 'ready' | 'live' | 'archived' | 'scheduled'
      schedule_entry_status: 'planned' | 'live' | 'skipped'
      research_entry_type: 'note' | 'link'
      content_piece_type: 'caption' | 'script' | 'video' | 'short_form'
      platform_type: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other'
      asset_file_type: 'image' | 'pdf' | 'video' | 'external_link'
      promoted_target_type: 'pillar' | 'content_piece'
      product_source: 'amway-price-checker' | 'manual'
      product_brand: 'amway' | 'vera'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
