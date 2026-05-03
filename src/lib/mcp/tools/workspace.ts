// @ts-nocheck
import { z } from 'zod'
import { createAdminClient, ok, fail } from '../helpers'
import type { KitTool } from '../types'

// ─── kit_get_workspace_context ───────────────────────────────

export const getWorkspaceContext: KitTool = {
  name: 'kit_get_workspace_context',
  description:
    'Get the active workspace for a Slack team or user. Use this at the start of any task to look up the workspace_id you need for all subsequent tool calls. If slack_team_id is provided and maps to a workspace, returns it. Otherwise returns the first (default) workspace.',
  schema: z.object({
    slack_team_id: z.string().optional().describe('Slack team ID from event payload (e.g., T01234ABC)'),
  }),
  annotations: { readOnlyHint: true },
  handler: async ({ slack_team_id }) => {
    const db = createAdminClient()

    if (slack_team_id) {
      const { data } = await db
        .from('workspaces' as any)
        .select('id, name, slug, plan, slack_team_id, settings, onboarding_completed')
        .eq('slack_team_id', slack_team_id)
        .limit(1)
        .maybeSingle()
      if (data) return ok(data, `Workspace for Slack team ${slack_team_id}:`)
    }

    const { data: first, error } = await db
      .from('workspaces' as any)
      .select('id, name, slug, plan, slack_team_id, settings, onboarding_completed')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return fail(error.message)
    if (!first) return fail('No workspaces exist yet. Run the seed migration first.')
    return ok(first, 'Default workspace:')
  },
}
