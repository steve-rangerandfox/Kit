import { withRetry } from '../retry'
import type { ServiceResult, ProjectIntakeForm } from '../types'

const SLACK_API = 'https://slack.com/api'

function headers() {
  return {
    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    'Content-Type': 'application/json; charset=utf-8',
  }
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`)
  return data
}

/**
 * Creates a Slack channel, invites team members, and posts a welcome message.
 * Replaces the Teams chat provisioner.
 */
export async function provisionSlackChannel(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  try {
    if (dryRun) {
      return { service: 'Slack Channel', success: true, url: 'https://slack.com/dry-run' }
    }

    // Slugify project name for channel name (lowercase, hyphens, max 80 chars)
    const slug = `${form.clientName}-${form.projectName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)

    // Step 1: create channel
    const createData = await withRetry(() =>
      slackPost('conversations.create', { name: slug, is_private: false })
    )
    const channelId: string = createData.channel.id

    // Step 2: set topic
    await withRetry(() =>
      slackPost('conversations.setTopic', {
        channel: channelId,
        topic: `${form.clientName} — ${form.projectName}`,
      })
    ).catch(() => {}) // non-critical

    // Step 3: invite team members
    const memberIds = [...new Set([form.projectManager, ...form.teamMembers])].filter(Boolean)
    if (memberIds.length > 0) {
      await withRetry(() =>
        slackPost('conversations.invite', {
          channel: channelId,
          users: memberIds.join(','),
        })
      ).catch(() => {}) // may fail if user already in channel
    }

    // Step 4: post welcome message
    const welcome = buildWelcomeMessage(form)
    await withRetry(() =>
      slackPost('chat.postMessage', { channel: channelId, text: welcome })
    )

    const url = `https://slack.com/app_redirect?channel=${channelId}`
    return { service: 'Slack Channel', success: true, url, id: channelId }
  } catch (err) {
    return { service: 'Slack Channel', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function buildWelcomeMessage(form: ProjectIntakeForm): string {
  const lines = [
    `*Welcome to the ${form.projectName} project channel!*`,
    '',
    `*Client:* ${form.clientName}`,
    `*Type:* ${form.projectType}`,
    `*PM:* <@${form.projectManager}>`,
  ]
  if (form.startDate) lines.push(`*Start:* ${form.startDate}`)
  if (form.deadline) lines.push(`*Deadline:* ${form.deadline}`)
  if (form.description) lines.push('', `_${form.description}_`)
  lines.push('', 'All project infrastructure is being set up — links will be posted shortly.')
  return lines.join('\n')
}
