export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      create_workspace: {
        Args: {
          workspace_name: string
          workspace_slug: string
          user_id: string
        }
        Returns: {
          id: string
          name: string
          slug: string
        }
      }
    }
  }
}
