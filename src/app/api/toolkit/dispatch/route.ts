// @ts-nocheck
import { NextResponse } from 'next/server'
import { getSessionManager } from '@/lib/managed-agents/session-manager'
import { getAgentRegistry } from '@/lib/managed-agents/agent-registry'
import { AGENT_KEYS } from '../../../../../agents'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/toolkit/dispatch
 * 
 * Dispatches a toolkit task to the appropriate Managed Agent.
 * Body: { tool: string, projectId: string, workspaceId: string, context?: string }
 */

const TOOL_TO_AGENT: Record<string, string> = {
  sow: AGENT_KEYS.SOW_GENERATOR,
  workback: AGENT_KEYS.WORKBACK_GENERATOR,
  script: AGENT_KEYS.SCRIPT_WRITER,
  storyboard: AGENT_KEYS.STORYBOARD_BUILDER,
  deck: AGENT_KEYS.DECK_BUILDER,
  scope_analysis: AGENT_KEYS.SCRIPT_SCOPING_ANALYZER,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tool, projectId, workspaceId, context } = body

    if (!tool || !projectId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: tool, projectId, workspaceId' },
        { status: 400 }
      )
    }

    const agentKey = TOOL_TO_AGENT[tool]
    if (!agentKey) {
      return NextResponse.json(
        { error: `Unknown toolkit tool: ${tool}. Available: ${Object.keys(TOOL_TO_AGENT).join(', ')}` },
        { status: 400 }
      )
    }

    const registry = getAgentRegistry()
    const sessionManager = getSessionManager()

    const agentId = await registry.getAgentId(agentKey)
    const environmentId = await registry.getEnvironmentId()

    if (!agentId || !environmentId) {
      return NextResponse.json(
        { error: 'Agents not registered. Run POST /api/agents/register first.' },
        { status: 503 }
      )
    }

    // Fetch project context from Supabase
    const supabase = createAdminClient()
    const { data: project } = await supabase
      .from('projects' as any)
      .select('*')
      .eq('id', projectId)
      .single()

    const projectContext = project
      ? `Project: ${project.name}\nClient: ${project.client_name}\nBudget: $${project.budget}\nStatus: ${project.status}\n${context || ''}`
      : context || 'No project context available'

    const prompt = `Generate a ${tool} for this project.\n\nProject Context:\n${projectContext}`

    const result = await sessionManager.dispatch(
      agentId,
      environmentId,
      {
        workspaceId,
        projectId,
        source: `toolkit:${tool}`,
        payload: body,
      },
      prompt
    )

    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      status: result.status,
      eventCount: result.events.length,
    })
  } catch (error) {
    console.error('[Toolkit Dispatch] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dispatch failed' },
      { status: 500 }
    )
  }
}
