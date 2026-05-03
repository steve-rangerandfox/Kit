// @ts-nocheck
import { NextResponse } from 'next/server'
import { routeWebhook } from '@/lib/managed-agents/webhook-router'

/**
 * Generic webhook receiver.
 * Identifies the event type and dispatches to the appropriate Managed Agent.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const eventType = payload.type || payload.event_type || 'unknown'
    const workspaceId = payload.workspace_id || ''
    const projectId = payload.project_id || ''

    // Map incoming event types to our route keys
    const routeMap: Record<string, string> = {
      transcript_ready: 'transcript',
      transcript_completed: 'transcript',
      farm_update: 'farm_status',
      render_completed: 'farm_status',
      project_created: 'project_ops',
      project_updated: 'project_ops',
      task_completed: 'project_ops',
    }

    const routeKey = routeMap[eventType]
    if (!routeKey) {
      return NextResponse.json(
        { error: `Unknown event type: ${eventType}` },
        { status: 400 }
      )
    }

    const result = await routeWebhook(routeKey, {
      workspaceId,
      projectId,
      source: `webhook:${eventType}`,
      payload,
    })

    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      status: result.status,
    })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
