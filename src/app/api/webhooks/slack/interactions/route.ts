// @ts-nocheck
import { NextResponse, after } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/verify'
import { runOrchestrator } from '@/lib/provisioner/orchestrator'
import { buildSummaryBlocks } from '@/lib/provisioner/slack-summary'
import type { ProjectIntakeForm, ServiceKey } from '@/lib/provisioner/types'
import { ALL_SERVICES } from '@/lib/provisioner/types'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

/**
 * POST /api/webhooks/slack/interactions
 *
 * Receives Slack interaction payloads (modal submissions, button clicks).
 * Payload is URL-encoded with a single `payload` field containing JSON.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const timestamp = request.headers.get('x-slack-request-timestamp') || ''
  const signature = request.headers.get('x-slack-signature') || ''

  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (signingSecret && !verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const params = new URLSearchParams(rawBody)
  const payloadStr = params.get('payload')
  if (!payloadStr) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(payloadStr)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Handle modal submission for project provisioning
  if (
    payload.type === 'view_submission' &&
    payload.view?.callback_id === 'kit_provision_project'
  ) {
    const userId = payload.user?.id || ''
    const meta = JSON.parse(payload.view.private_metadata || '{}')
    const channelId = meta.channel_id || ''
    const values = payload.view.state?.values || {}

    // Extract form values
    const form: ProjectIntakeForm = {
      projectNumber: values.project_number?.val?.value || '',
      projectName: values.project_name?.val?.value || '',
      clientName: values.client_name?.val?.value || '',
      projectType: values.project_type?.val?.selected_option?.value || 'Other',
      projectManager: values.project_manager?.val?.selected_user || userId,
      teamMembers: values.team_members?.val?.selected_users || [],
      startDate: values.start_date?.val?.selected_date || undefined,
      deadline: values.deadline?.val?.selected_date || undefined,
      description: values.description?.val?.value || undefined,
      selectedServices: extractServices(values),
    }

    // Resolve workspace
    const workspaceId = await resolveWorkspaceId(payload.team?.id || '')

    // Dismiss modal immediately
    // Run orchestration in background via after()
    after(async () => {
      try {
        // DM user that provisioning started
        await postSlack(userId, `Provisioning *${form.projectName}* for ${form.clientName}...`)

        const onProgress = async (_phase: string, message: string) => {
          await postSlack(userId, message)
        }

        const results = await runOrchestrator(
          { form, workspaceId, channelId, userId },
          onProgress
        )

        // Post summary to the channel
        const blocks = buildSummaryBlocks(results, form.projectName)
        const targetChannel = results.slack?.id || channelId
        if (targetChannel) {
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
              channel: targetChannel,
              text: `${form.projectName} — Project Provisioned`,
              blocks,
            }),
          })
        }
      } catch (err) {
        console.error('[Interactions] Provisioning failed:', err)
        await postSlack(userId, `Provisioning failed: ${err?.message || 'unknown error'}`)
      }
    })

    // Return empty response to dismiss modal
    return NextResponse.json({ response_action: 'clear' })
  }

  // Unhandled interaction type
  return NextResponse.json({ ok: true })
}

function extractServices(values: any): ServiceKey[] {
  const selected = values.services?.val?.selected_options
  if (!Array.isArray(selected) || selected.length === 0) return [...ALL_SERVICES]
  return selected.map((opt: any) => opt.value as ServiceKey)
}

async function resolveWorkspaceId(teamId: string): Promise<string> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slack_team_id', teamId)
      .limit(1)
      .single()
    if (data?.id) return data.id

    const { data: first } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()
    return first?.id || ''
  } catch {
    return ''
  }
}

async function postSlack(channel: string, text: string) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text }),
  })
}
