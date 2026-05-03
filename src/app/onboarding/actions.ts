'use server'

import { createActionClient } from '@/lib/supabase/server'

export async function createWorkspace(name: string, slug: string) {
  try {
    const supabase = await createActionClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('create_workspace' as any, {
      workspace_name: name,
      workspace_slug: slug,
      user_id: user.id,
    } as any)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, workspace: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}