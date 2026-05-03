// @ts-nocheck
import { z } from 'zod'
import { createAdminClient } from '../helpers'
import type { KitTool } from '../types'
import { runOrchestrator } from '@/lib/provisioner/orchestrator'
import type { ProjectIntakeForm, ServiceKey } from '@/lib/provisioner/types'
import { ALL_SERVICES } from '@/lib/provisioner/types'

export const provisionProject: KitTool = {
  name: 'kit_provision_project',
  description:
    'Provision a new project across studio tools (Dropbox, Frame.io, Canva, OneDrive, Clockify, FigJam, Slack channel). Creates folder structures, project tracking, and a Slack channel with team members invited.',
  schema: z.object({
    workspace_id: z.string().uuid().describe('The workspace ID'),
    project_number: z.string().min(1).describe('Project number e.g. 2601'),
    project_name: z.string().min(1).describe('Project name'),
    client_name: z.string().min(1).describe('Client name'),
    project_type: z
      .enum(['Brand Video', 'Motion Graphics', 'Social Campaign', 'Explainer', 'Broadcast', 'Other'])
      .optional()
      .default('Other')
      .describe('Project type'),
    project_manager: z.string().optional().default('').describe('Slack user ID of the PM'),
    team_members: z.array(z.string()).optional().default([]).describe('Slack user IDs of team members'),
    start_date: z.string().optional().describe('ISO date string'),
    deadline: z.string().optional().describe('ISO date string'),
    description: z.string().optional().describe('Brief project description'),
    services: z
      .array(z.enum(['dropbox', 'frameio', 'canva', 'onedrive', 'clockify', 'figma', 'slack']))
      .optional()
      .describe('Services to provision. Defaults to all.'),
    dry_run: z.boolean().optional().default(false).describe('If true, simulates without making API calls'),
  }),
  annotations: { readOnlyHint: false },
  handler: async (input: any) => {
    const form: ProjectIntakeForm = {
      projectNumber: input.project_number,
      projectName: input.project_name,
      clientName: input.client_name,
      projectType: input.project_type,
      projectManager: input.project_manager,
      teamMembers: input.team_members,
      startDate: input.start_date,
      deadline: input.deadline,
      description: input.description,
      selectedServices: (input.services as ServiceKey[]) || [...ALL_SERVICES],
    }

    const results = await runOrchestrator({
      form,
      workspaceId: input.workspace_id,
      dryRun: input.dry_run,
    })

    const summary = Object.entries(results)
      .filter(([k, v]) => k !== 'projectId' && v && typeof v === 'object')
      .map(([, v]: any) => {
        if (v.error === 'skipped') return `${v.service}: skipped`
        return v.success ? `${v.service}: ${v.url || 'done'}` : `${v.service}: FAILED — ${v.error}`
      })
      .join('\n')

    const db = createAdminClient()
    return {
      content: [
        {
          type: 'text' as const,
          text: `Provisioned project "${input.project_name}"${results.projectId ? ` (${results.projectId})` : ''}:\n\n${summary}`,
        },
      ],
      structuredContent: results,
    }
  },
}
