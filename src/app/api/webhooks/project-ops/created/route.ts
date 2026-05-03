/**
 * Project Ops project creation webhook
 * Receives new project data and creates Kit project
 */

import { createProjectFromPO } from '@/lib/integrations/project-ops'
import type { POWebhookPayload } from '@/lib/integrations/project-ops'
import type { NextRequest } from 'next/server'

/**
 * POST handler for Project Ops project created webhook
 */
export async function POST(request: NextRequest) {
  try {
    const payload: POWebhookPayload = await request.json()

    // Validate required fields
    if (!payload.poProjectId || !payload.projectName || !payload.budget) {
      return Response.json(
        { error: 'Missing required fields in payload' },
        { status: 400 }
      )
    }

    // Extract workspace ID from header or query param
    const workspaceId =
      request.headers.get('x-workspace-id') ||
      request.nextUrl.searchParams.get('workspaceId')

    if (!workspaceId) {
      return Response.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Create project in Kit
    const projectId = await createProjectFromPO(workspaceId, payload)

    return Response.json(
      {
        success: true,
        message: 'Project created successfully',
        projectId,
        poProjectId: payload.poProjectId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Project Ops webhook error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for health check
 */
export async function GET(request: NextRequest) {
  return Response.json(
    {
      status: 'healthy',
      endpoint: '/api/webhooks/project-ops/created',
      description: 'Project Ops project creation webhook receiver',
    },
    { status: 200 }
  )
}
