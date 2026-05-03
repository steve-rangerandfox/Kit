// @ts-nocheck
/**
 * Granola transcription integration
 * Receives meeting transcripts via webhook and ingests to RAG
 */

import { ingestTranscript } from '@/lib/rag/ingest'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Webhook payload structure from Granola
 */
export interface GranolaWebhookPayload {
  callId: string
  transcriptUrl?: string
  transcript: string
  duration: number // seconds
  participants: Array<{
    name: string
    email: string
  }>
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  metadata?: {
    title?: string
    meetingType?: string
    tags?: string[]
  }
}

/**
 * Processes a Granola transcript webhook
 * Routes transcript to founder stream and ingests to RAG
 *
 * @param workspaceId ID of the workspace
 * @param projectId ID of the project (if associated)
 * @param payload Webhook payload from Granola
 * @returns Promise resolving to ingestion result
 */
export async function processGranolaTranscript(
  workspaceId: string,
  projectId: string,
  payload: GranolaWebhookPayload
): Promise<{
  success: boolean
  documentId?: string
  chunkCount?: number
  error?: string
}> {
  try {
    if (!payload.transcript || payload.transcript.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript is empty',
      }
    }

    // Extract title from metadata or create default
    const title =
      payload.metadata?.title ||
      `Call: ${new Date(payload.startTime).toLocaleDateString()}`

    // Extract speaker info
    const speakerList = payload.participants
      .map(p => p.name)
      .filter(Boolean)
      .join(', ')

    // Ingest to RAG (always founder stream per default)
    const result = await ingestTranscript(
      workspaceId,
      projectId,
      title,
      payload.transcript,
      'founder', // Granola transcripts route to founder stream
      {
        call_date: new Date(payload.startTime),
        speaker: speakerList || undefined,
        duration_minutes: Math.round(payload.duration / 60),
      }
    )

    // Store call metadata in database
    const supabase = createAdminClient()
    const { error: metaError } = await supabase
      .from('call_transcripts' as any)
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        granola_call_id: payload.callId,
        title,
        transcript: payload.transcript,
        duration_seconds: payload.duration,
        participants: payload.participants,
        start_time: payload.startTime,
        end_time: payload.endTime,
        source: 'granola',
      })

    if (metaError) {
      console.error('Failed to store call metadata:', metaError)
      // Non-fatal: transcript is still ingested
    }

    return {
      success: true,
      documentId: result.documentId,
      chunkCount: result.chunkCount,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Webhook signature verification for Granola
 * Validates that the webhook came from Granola
 *
 * @param payload Request body
 * @param signature Signature header from request
 * @param secret Granola webhook secret
 * @returns True if signature is valid
 */
export async function verifyGranolaSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const crypto = await import('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    return signature === expectedSignature
  } catch (error) {
    console.error('Failed to verify Granola signature:', error)
    return false
  }
}
