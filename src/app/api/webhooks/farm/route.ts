// @ts-nocheck
/**
 * Render farm status webhook receiver
 * Receives farm node health data and creates alerts if needed
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

/**
 * Farm node status payload
 */
interface FarmStatusPayload {
  nodeId: string
  status: 'healthy' | 'degraded' | 'offline' | 'error'
  cpuUsage: number // 0-100
  memoryUsage: number // 0-100
  gpuUsage?: number // 0-100
  diskUsage: number // 0-100
  temperature?: number // Celsius
  lastHeartbeat: string // ISO 8601
  error?: string
  timestamp: string // ISO 8601
}

/**
 * POST handler for farm node status updates
 */
export async function POST(request: NextRequest) {
  try {
    const payload: FarmStatusPayload = await request.json()

    // Validate payload
    if (!payload.nodeId || !payload.status || !payload.timestamp) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Upsert farm status
    const { error: statusError } = await supabase
      .from('farm_status' as any)
      .upsert(
        {
          node_id: payload.nodeId,
          status: payload.status,
          cpu_usage: payload.cpuUsage,
          memory_usage: payload.memoryUsage,
          gpu_usage: payload.gpuUsage,
          disk_usage: payload.diskUsage,
          temperature: payload.temperature,
          last_heartbeat: payload.lastHeartbeat,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'node_id',
        }
      )

    if (statusError) {
      console.error('Failed to upsert farm status:', statusError)
      return Response.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    // Create kit_action if there's an error
    if (payload.status === 'error' && payload.error) {
      const { error: actionError } = await supabase
        .from('kit_actions' as any)
        .insert({
          agent_run_id: `farm-monitor-${Date.now()}`,
          type: 'custom',
          status: 'suggested',
          title: `Farm Node Error: ${payload.nodeId}`,
          description: `Node ${payload.nodeId} reported error: ${payload.error}`,
          payload: {
            nodeId: payload.nodeId,
            error: payload.error,
            status: payload.status,
          },
          confidence_score: 0.95,
          recommended_by: 'farm-monitor',
        })

      if (actionError) {
        console.error('Failed to create kit_action:', actionError)
      }
    }

    return Response.json(
      { success: true, message: 'Farm status updated' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Farm webhook error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
