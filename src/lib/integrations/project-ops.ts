// @ts-nocheck
/**
 * Project Ops integration
 * Bidirectional sync with Project Ops for project creation, updates, and financial data
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Project,
  ProjectPhase,
  ProjectStatus,
  Milestone,
  Deliverable,
} from '@/types/database'

/**
 * Webhook payload from Project Ops when a new project is created
 */
export interface POWebhookPayload {
  poProjectId: string
  projectName: string
  clientName: string
  clientContact?: string
  description?: string
  budget: number
  currency: string
  startDate: string // ISO 8601
  endDate: string // ISO 8601
  deadline?: string // ISO 8601
  deliverables: Array<{
    name: string
    description?: string
    category: string
    dueDate: string // ISO 8601
    specifications?: Record<string, string>
  }>
  teamMembers?: Array<{
    email: string
    role: string
  }>
  tags?: string[]
}

/**
 * Creates a Kit project from Project Ops webhook data
 * Sets up deliverables and team access
 *
 * @param workspaceId ID of the workspace
 * @param poData Project Ops webhook payload
 * @returns Promise resolving to created project ID
 */
export async function createProjectFromPO(
  workspaceId: string,
  poData: POWebhookPayload
): Promise<string> {
  const supabase = createAdminClient()

  // Create the project
  const { data: projectData, error: projectError } = await supabase
    .from('projects' as any)
    .insert({
      workspace_id: workspaceId,
      name: poData.projectName,
      description: poData.description,
      status: 'planning' as ProjectStatus,
      phase: 'pre_production' as ProjectPhase,
      budget: poData.budget,
      currency: poData.currency,
      start_date: poData.startDate,
      end_date: poData.endDate,
      deadline: poData.deadline,
      client_name: poData.clientName,
      client_contact: poData.clientContact,
      tags: poData.tags,
      po_project_id: poData.poProjectId, // Track PO ID for sync
    })
    .select('id')
    .single()

  if (projectError) {
    throw new Error(`Failed to create project: ${projectError.message}`)
  }

  const projectId = projectData.id

  // Create milestone for each deliverable group
  const milestoneName = `Deliverables: ${poData.projectName}`
  const { data: milestoneData, error: milestoneError } = await supabase
    .from('milestones' as any)
    .insert({
      project_id: projectId,
      name: milestoneName,
      status: 'not_started',
      due_date: poData.deadline || poData.endDate,
      progress_percentage: 0,
    })
    .select('id')
    .single()

  if (milestoneError) {
    throw new Error(`Failed to create milestone: ${milestoneError.message}`)
  }

  // Create deliverables
  const deliverables = poData.deliverables.map(del => ({
    milestone_id: milestoneData.id,
    project_id: projectId,
    name: del.name,
    description: del.description,
    format: (mapDeliverableFormat(del.category) || 'other') as any,
    status: 'not_started' as const,
    specifications: del.specifications,
    due_date: del.dueDate,
    version: 1,
  }))

  const { error: delivError } = await supabase
    .from('deliverables' as any)
    .insert(deliverables)

  if (delivError) {
    throw new Error(`Failed to create deliverables: ${delivError.message}`)
  }

  // Assign team members if provided
  if (poData.teamMembers && poData.teamMembers.length > 0) {
    // In production, would map emails to Kit team member IDs
    // For now, store as pending team assignments
    console.log(`Team members for project ${projectId}:`, poData.teamMembers)
  }

  return projectId
}

/**
 * Maps Project Ops category to Kit deliverable format
 */
function mapDeliverableFormat(
  poCategory: string
): string | undefined {
  const mapping: Record<string, string> = {
    video: 'video',
    audio: 'audio',
    image: 'image',
    design: 'design',
    animation: 'animation',
    document: 'document',
    code: 'code',
  }
  return mapping[poCategory.toLowerCase()]
}

/**
 * Computes actual hours snapshot for a project
 * Aggregates time entries by category
 *
 * @param projectId ID of the project
 * @returns Promise resolving to actual hours by category
 */
export async function computeActualsSnapshot(
  projectId: string
): Promise<{
  totalHours: number
  byCategory: Record<string, number>
}> {
  const supabase = createAdminClient()

  const { data: entries, error } = await supabase
    .from('time_entries' as any)
    .select('category, duration_minutes')
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to fetch time entries: ${error.message}`)
  }

  const byCategory: Record<string, number> = {}
  let totalMinutes = 0

  for (const entry of entries || []) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + entry.duration_minutes
    totalMinutes += entry.duration_minutes
  }

  // Convert to hours
  const result: Record<string, number> = {}
  for (const [cat, minutes] of Object.entries(byCategory)) {
    result[cat] = Math.round((minutes / 60) * 100) / 100 // Round to 2 decimals
  }

  return {
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    byCategory: result,
  }
}

/**
 * Pushes hourly actuals to Project Ops
 * Sends current time tracking snapshot
 *
 * @param workspaceId ID of the workspace
 * @param projectId ID of the project
 * @param projectOpsWebhookUrl Webhook URL from Project Ops
 * @returns Promise that resolves when sent
 */
export async function pushHourlyActuals(
  workspaceId: string,
  projectId: string,
  projectOpsWebhookUrl: string
): Promise<void> {
  const supabase = createAdminClient()

  // Get project and PO ID
  const { data: project, error: projError } = await supabase
    .from('projects' as any)
    .select('po_project_id')
    .eq('id', projectId)
    .single()

  if (projError) {
    throw new Error(`Failed to fetch project: ${projError.message}`)
  }

  // Compute actuals
  const actuals = await computeActualsSnapshot(projectId)

  // Send to Project Ops
  const response = await fetch(projectOpsWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Project-Id': projectId,
    },
    body: JSON.stringify({
      poProjectId: project.po_project_id,
      timestamp: new Date().toISOString(),
      actualHours: actuals.totalHours,
      byCategory: actuals.byCategory,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to push actuals to Project Ops: ${response.statusText}`
    )
  }
}

/**
 * Pushes final project close data to Project Ops
 * Sends complete financial and timeline data
 *
 * @param workspaceId ID of the workspace
 * @param projectId ID of the project
 * @param projectOpsWebhookUrl Webhook URL from Project Ops
 * @returns Promise that resolves when sent
 */
export async function pushProjectClose(
  workspaceId: string,
  projectId: string,
  projectOpsWebhookUrl: string
): Promise<void> {
  const supabase = createAdminClient()

  // Get project details
  const { data: project, error: projError } = await supabase
    .from('projects' as any)
    .select('*')
    .eq('id', projectId)
    .single()

  if (projError) {
    throw new Error(`Failed to fetch project: ${projError.message}`)
  }

  // Compute final actuals
  const actuals = await computeActualsSnapshot(projectId)

  // Get deliverables status
  const { data: deliverables } = await supabase
    .from('deliverables' as any)
    .select('status')
    .eq('project_id', projectId)

  const completedCount = (deliverables || []).filter(
    d => d.status === 'completed'
  ).length

  // Send to Project Ops
  const response = await fetch(projectOpsWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Project-Id': projectId,
      'X-Event-Type': 'project-close',
    },
    body: JSON.stringify({
      poProjectId: project.po_project_id,
      status: project.status,
      completedAt: new Date().toISOString(),
      budget: project.budget,
      actualCost: null, // Would compute from time entries * rates
      actualHours: actuals.totalHours,
      byCategory: actuals.byCategory,
      deliverables: {
        total: deliverables?.length || 0,
        completed: completedCount,
      },
      timeline: {
        startDate: project.start_date,
        endDate: project.end_date,
        deadline: project.deadline,
        completedDate: new Date().toISOString(),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to push project close to Project Ops: ${response.statusText}`
    )
  }
}
