// @ts-nocheck
'use server'

import { createActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateProjectInput {
  name: string
  client_name: string
  project_code: string
  type: string
  start_date: string
  due_date: string
  budget: number
  margin_target: number
  revision_rounds: number
  brief: string
}

export async function createProject(formData: CreateProjectInput) {
  const supabase = await createActionClient()

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get workspace from team_members
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      throw new Error('Workspace not found')
    }

    // For now, just insert mock data and return success
    // When database is ready, this will insert into projects table
    const newProject = {
      id: `proj-${Date.now()}`,
      workspace_id: teamMember.workspace_id,
      name: formData.name,
      client_name: formData.client_name,
      project_code: formData.project_code,
      type: formData.type,
      status: 'planning' as const,
      budget: formData.budget,
      start_date: formData.start_date,
      due_date: formData.due_date,
      margin_target: formData.margin_target,
      revision_rounds: formData.revision_rounds,
      brief: formData.brief,
      created_at: new Date(),
    }

    // TODO: Insert into projects table when schema is ready
    // const { data, error } = await supabase
    //   .from('projects')
    //   .insert([newProject])
    //   .select()

    revalidatePath('/projects')
    return { success: true, projectId: newProject.id }
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

export async function deleteProject(projectId: string) {
  const supabase = await createActionClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // TODO: Implement soft delete (set status to archived) when database is ready
    // const { error } = await supabase
    //   .from('projects')
    //   .update({ status: 'archived' })
    //   .eq('id', projectId)

    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}
