/**
 * Database types for Supabase
 * 
 * To generate types from your Supabase schema, run:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
 * 
 * For now, this is a placeholder that will be updated once the database schema is defined.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // Projects table - stores building projects
      projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          description: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          building_class: string | null;
          building_type: string | null;
          climate_zone: string | null;
          wind_region: string | null;
          bushfire_prone: boolean | null;
          bushfire_attack_level: string | null;
          state: string | null;
          construction_stage: string | null;
          construction_type: string | null;
          number_of_storeys: number | null;
          floor_area: number | null;
          status: "draft" | "active" | "on_hold" | "completed" | "archived";
          start_date: string | null;
          target_completion_date: string | null;
          actual_completion_date: string | null;
          // New fields
          project_type: "new_build" | "renovation" | "extension" | null;
          ncc_context: "volume_one" | "volume_two" | null;
          ncc_version: "ncc_2025" | "ncc_2022" | "ncc_2019" | null;
          construction_value: number | null;
          construction_scopes: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          building_class?: string | null;
          building_type?: string | null;
          climate_zone?: string | null;
          wind_region?: string | null;
          bushfire_prone?: boolean | null;
          bushfire_attack_level?: string | null;
          state?: string | null;
          construction_stage?: string | null;
          construction_type?: string | null;
          number_of_storeys?: number | null;
          floor_area?: number | null;
          status?: "draft" | "active" | "on_hold" | "completed" | "archived";
          start_date?: string | null;
          target_completion_date?: string | null;
          actual_completion_date?: string | null;
          // New fields
          project_type?: "new_build" | "renovation" | "extension" | null;
          ncc_context?: "volume_one" | "volume_two" | null;
          ncc_version?: "ncc_2025" | "ncc_2022" | "ncc_2019" | null;
          construction_value?: number | null;
          construction_scopes?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          building_class?: string | null;
          building_type?: string | null;
          climate_zone?: string | null;
          wind_region?: string | null;
          bushfire_prone?: boolean | null;
          bushfire_attack_level?: string | null;
          state?: string | null;
          construction_stage?: string | null;
          construction_type?: string | null;
          number_of_storeys?: number | null;
          floor_area?: number | null;
          status?: "draft" | "active" | "on_hold" | "completed" | "archived";
          start_date?: string | null;
          target_completion_date?: string | null;
          actual_completion_date?: string | null;
          // New fields
          project_type?: "new_build" | "renovation" | "extension" | null;
          ncc_context?: "volume_one" | "volume_two" | null;
          ncc_version?: "ncc_2025" | "ncc_2022" | "ncc_2019" | null;
          construction_value?: number | null;
          construction_scopes?: string[] | null;
        };
        Relationships: [];
      };
      // Checklists table - stores compliance checklists
      checklists: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          project_id: string;
          name: string;
          stage: string;
          status: "pending" | "in_progress" | "completed";
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id: string;
          name: string;
          stage: string;
          status?: "pending" | "in_progress" | "completed";
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id?: string;
          name?: string;
          stage?: string;
          status?: "pending" | "in_progress" | "completed";
        };
        Relationships: [];
      };
      // Checklist items table - individual check items
      checklist_items: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          checklist_id: string;
          ncc_clause: string | null;
          description: string;
          is_compliant: boolean | null;
          notes: string | null;
          photo_urls: string[] | null;
          checked_at: string | null;
          checked_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          checklist_id: string;
          ncc_clause?: string | null;
          description: string;
          is_compliant?: boolean | null;
          notes?: string | null;
          photo_urls?: string[] | null;
          checked_at?: string | null;
          checked_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          checklist_id?: string;
          ncc_clause?: string | null;
          description?: string;
          is_compliant?: boolean | null;
          notes?: string | null;
          photo_urls?: string[] | null;
          checked_at?: string | null;
          checked_by?: string | null;
        };
        Relationships: [];
      };
      // Profiles table - user profiles
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          company: string | null;
          role: "builder" | "architect" | "surveyor" | "certifier" | "other";
          subscription_tier: "free" | "pro" | "enterprise";
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          company?: string | null;
          role?: "builder" | "architect" | "surveyor" | "certifier" | "other";
          subscription_tier?: "free" | "pro" | "enterprise";
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          company?: string | null;
          role?: "builder" | "architect" | "surveyor" | "certifier" | "other";
          subscription_tier?: "free" | "pro" | "enterprise";
          avatar_url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      project_status: "draft" | "active" | "on_hold" | "completed" | "archived";
      checklist_status: "pending" | "in_progress" | "completed";
      user_role: "builder" | "architect" | "surveyor" | "certifier" | "other";
      subscription_tier: "free" | "pro" | "enterprise";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

