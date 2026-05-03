// @ts-nocheck
import { z } from 'zod'
import { createAdminClient, ok, fail } from '../helpers'
import { inngest } from '@/lib/inngest/client'
import type { ServiceKey } from '@/lib/inngest/agents/types'
import type { KitTool } from '../types'

const workspaceId = z.string().uuid().describe('The workspace this operation scopes to')

// ─── kit_list_projects ───────────────────────────────────────

export const listProjects: KitTool = {
  name: 'kit_list_projects',
  description:
    'List projects in a workspace, optionally filtered by status or client. Returns id, name, client, status, project_code, budget info, and delivery target.',
  schema: z.object({
    workspace_id: workspaceId,
    status: z
      .enum(['active', 'paused', 'completed', 'archived', 'cancelled'])
      .optional()
      .describe('Filter by project status'),
    client: z.string().optional().describe('Filter by client name (exact match)'),
    limit: z.number().int().min(1).max(100).optional().default(25),
  }),
  annotations: { readOnlyHint: true },
  handler: async ({ workspace_id, status, client, limit = 25 }) => {
    const db = createAdminClient()
    let q = db
      .from('projects' as any)
      .select(
        'id, name, client, project_code, project_type, status, start_date, target_delivery, budget_total, budget_spent, revision_rounds_used, revision_rounds_budgeted'
      )
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)
    if (client) q = q.eq('client', client)
    const { data, error } = await q
    if (error) return fail(error.message)
    return ok({ count: data?.length || 0, projects: data || [] })
  },
}

// ─── kit_get_project ─────────────────────────────────────────

export const getProject: KitTool = {
  name: 'kit_get_project',
  description:
    'Get full details of a single project including deliverables, milestones, and financial summary. Use this before taking actions on a project to ground your decisions.',
  schema: z.object({
    workspace_id: workspaceId,
    project_id: z.string().uuid().describe('The project UUID'),
  }),
  annotations: { readOnlyHint: true },
  handler: async ({ workspace_id, project_id }) => {
    const db = createAdminClient()
    const { data: project, error } = await db
      .from('projects' as any)
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('id', project_id)
      .maybeSingle()
    if (error) return fail(error.message)
    if (!project) return fail(`Project ${project_id} not found in workspace`)

    const [{ data: deliverables }, { data: milestones }] = await Promise.all([
      db
        .from('deliverables' as any)
        .select('id, name, status, due_date, delivered_at, delivery_url')
        .eq('project_id', project_id)
        .order('due_date', { ascending: true }),
      db
        .from('milestones' as any)
        .select('id, name, status, phase_type, due_date, owner, assigned_to, completed_at')
        .eq('project_id', project_id)
        .order('due_date', { ascending: true }),
    ])

    return ok({
      project,
      deliverables: deliverables || [],
      milestones: milestones || [],
    })
  },
}

// ─── kit_create_project ──────────────────────────────────────

export const createProject: KitTool = {
  name: 'kit_create_project',
  description:
    'Create a new project. This is the main way Kit spins up work after a kickoff call. Name and client are required. You can also pass initial budget, target delivery date, brief summary, and SOW summary. Returns the newly-created project with its UUID.',
  schema: z.object({
    workspace_id: workspaceId,
    name: z.string().min(1).describe('Project name (e.g., "NRG Spring Campaign 2026")'),
    client: z.string().min(1).describe('Client name (e.g., "NRG Energy")'),
    project_code: z.string().optional().describe('Short code for internal use'),
    project_type: z.string().optional().describe('Category: e.g., "campaign", "broadcast", "brand-identity"'),
    start_date: z.string().optional().describe('ISO date string'),
    target_delivery: z.string().optional().describe('ISO date string for final delivery'),
    budget_total: z.number().optional().describe('Total budget in USD'),
    margin_target: z.number().optional().describe('Target profit margin as decimal (e.g., 0.40 for 40%)'),
    revision_rounds_budgeted: z.number().int().optional().describe('How many revision rounds are in scope'),
    brief_summary: z.string().optional().describe('Short summary of the creative brief'),
    sow_summary: z.string().optional().describe('Short summary of the statement of work'),
  }),
  annotations: { destructiveHint: false, idempotentHint: false },
  handler: async (input) => {
    const db = createAdminClient()
    const { workspace_id, ...fields } = input

    // ── Step 1: Create project record in Supabase (fast, <1s) ──
    const { data, error } = await db
      .from('projects' as any)
      .insert({ workspace_id, ...fields })
      .select('*')
      .single()
    if (error) return fail(error.message)

    // ── Step 2: Fire Inngest event for async provisioning ───────
    // Kit returns immediately. The orchestrator runs in the background
    // with full retry, timeout, and observability per agent.
    const services: ServiceKey[] = ['harvest', 'dropbox', 'frameio', 'slack']

    try {
      await inngest.send({
        name: 'kit/project.provision',
        data: {
          projectId: data.id,
          workspaceId: workspace_id,
          projectName: data.name,
          client: data.client,
          projectCode: data.project_code || undefined,
          projectType: data.project_type || undefined,
          startDate: data.start_date || undefined,
          targetDelivery: data.target_delivery || undefined,
          briefSummary: data.brief_summary || undefined,
          budgetTotal: data.budget_total || undefined,
          services,
        },
      })
    } catch (sendErr: any) {
      console.error('[kit_create_project] Failed to send Inngest event:', sendErr?.message)
      // Non-fatal — the project record is already created
    }

    return ok(
      {
        ...data,
        provisioning: 'in_progress',
        provisioning_services: services,
      },
      `Created project "${data.name}" (${data.id}) — provisioning Harvest, Dropbox, Frame.io, and Slack in the background.`
    )
  },
}

// ─── kit_update_project ──────────────────────────────────────

export const updateProject: KitTool = {
  name: 'kit_update_project',
  description:
    'Update fields on an existing project. Only include the fields you want to change. Common uses: updating status, adjusting target delivery, updating budget_spent, setting revision_rounds_used, or attaching project_ops_id after creating in a project tool.',
  schema: z.object({
    workspace_id: workspaceId,
    project_id: z.string().uuid(),
    name: z.string().optional(),
    status: z.enum(['active', 'paused', 'completed', 'archived', 'cancelled']).optional(),
    target_delivery: z.string().optional(),
    budget_total: z.number().optional(),
    budget_spent: z.number().optional(),
    revision_rounds_used: z.number().int().optional(),
    revision_rounds_budgeted: z.number().int().optional(),
    brief_summary: z.string().optional(),
    sow_summary: z.string().optional(),
    project_ops_id: z.string().optional(),
    financial_sheet_url: z.string().optional(),
  }),
  handler: async (input) => {
    const db = createAdminClient()
    const { workspace_id, project_id, ...fields } = input
    if (Object.keys(fields).length === 0) return fail('No fields to update')
    const { data, error } = await db
      .from('projects' as any)
      .update(fields)
      .eq('workspace_id', workspace_id)
      .eq('id', project_id)
      .select('*')
      .single()
    if (error) return fail(error.message)
    return ok(data, `Updated project ${project_id}`)
  },
}
