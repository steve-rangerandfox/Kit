// @ts-nocheck
/**
 * Bolt Message Handlers
 *
 * Handles app_mention and direct message events. No timeout ceiling —
 * this runs in a persistent process on Railway, not a serverless function.
 *
 * Flow:
 *   1. Detect special patterns (Frame.io links, time entries)
 *   2. Resolve workspace + user context for access control
 *   3. Dispatch to the agent registry for general requests
 *   4. Post the response back in-thread
 */

import type { App } from '@slack/bolt'
import { createAdminClient } from '../../../src/lib/supabase/admin'
import { dispatch, getCapabilitiesManifest } from '../../../src/lib/inngest/agents/registry'
import {
  resolveUserContext,
  checkGateway,
  filterResultData,
} from '../../../src/lib/inngest/access-control'
import { messageHasFrameIoLink, handleFrameIoLink } from '../../../src/lib/frameio/slack-handler'
import { isTimeEntryMessage, handleTimeEntry } from '../../../src/lib/harvest/slack-handler'

export function registerMessageHandlers(app: App) {
  // ─── @mentions ────────────────────────────────────────────
  app.event('app_mention', async ({ event, say, client }) => {
    // Ignore bot messages (prevent loops)
    if (event.bot_id || (event as any).subtype === 'bot_message') return

    const channelId = event.channel
    const threadTs = event.thread_ts || event.ts
    const messageText = event.text || ''
    const userId = event.user

    try {
      // Resolve workspace from Slack team
      const teamId = (event as any).team || ''
      const workspaceId = await resolveWorkspaceId(teamId)

      // ── Frame.io link detection ───────────────────────────
      if (messageHasFrameIoLink(messageText)) {
        console.log('[Bolt] Frame.io link detected in mention')
        await handleFrameIoLink({
          text: messageText,
          channelId,
          threadTs,
          messageTs: event.ts,
          userId,
          workspaceId,
        })
        return
      }

      // ── Time entry detection ──────────────────────────────
      if (isTimeEntryMessage(messageText)) {
        console.log('[Bolt] Time entry detected in mention')
        await handleTimeEntry({
          text: messageText,
          channelId,
          threadTs,
          messageTs: event.ts,
          userId,
          workspaceId,
        })
        return
      }

      // ── Agent dispatch ────────────────────────────────────
      // Strip the @mention from the text to get the actual request
      const cleanText = messageText.replace(/<@[A-Z0-9]+>/g, '').trim()
      if (!cleanText) {
        await say({ text: "Hey! What can I help you with?", thread_ts: threadTs })
        return
      }

      const response = await handleAgentRequest({
        text: cleanText,
        userId,
        workspaceId,
        channelId,
        threadTs,
      })

      await say({ text: response, thread_ts: threadTs })
    } catch (err: any) {
      console.error('[Bolt] app_mention handler error:', err)
      await say({
        text: `I hit an error processing that: ${err.message || 'unknown'}`,
        thread_ts: threadTs,
      })
    }
  })

  // ─── Direct Messages ──────────────────────────────────────
  app.event('message', async ({ event, say }) => {
    // Only handle DMs (im channel type)
    const msgEvent = event as any
    if (msgEvent.channel_type !== 'im') return

    // Ignore bot messages, message_changed, etc.
    if (msgEvent.bot_id || msgEvent.subtype) return

    const channelId = msgEvent.channel
    const threadTs = msgEvent.thread_ts || msgEvent.ts
    const messageText = msgEvent.text || ''
    const userId = msgEvent.user

    try {
      const teamId = msgEvent.team || ''
      const workspaceId = await resolveWorkspaceId(teamId)

      // Frame.io links work in DMs too
      if (messageHasFrameIoLink(messageText)) {
        console.log('[Bolt] Frame.io link detected in DM')
        await handleFrameIoLink({
          text: messageText,
          channelId,
          threadTs,
          messageTs: msgEvent.ts,
          userId,
          workspaceId,
        })
        return
      }

      // Time entries in DMs
      if (isTimeEntryMessage(messageText)) {
        console.log('[Bolt] Time entry detected in DM')
        await handleTimeEntry({
          text: messageText,
          channelId,
          threadTs,
          messageTs: msgEvent.ts,
          userId,
          workspaceId,
        })
        return
      }

      // Agent dispatch
      const response = await handleAgentRequest({
        text: messageText,
        userId,
        workspaceId,
        channelId,
        threadTs,
      })

      await say({ text: response, thread_ts: threadTs })
    } catch (err: any) {
      console.error('[Bolt] DM handler error:', err)
      await say({
        text: `I hit an error processing that: ${err.message || 'unknown'}`,
        thread_ts: threadTs,
      })
    }
  })
}

// ─── Agent Request Handler ──────────────────────────────────
// This is the core dispatch logic that replaces the managed-agent
// webhook router. It runs directly in-process — no Inngest, no
// serverless timeout, no cold starts.

interface AgentRequest {
  text: string
  userId: string
  workspaceId: string
  channelId: string
  threadTs: string
}

async function handleAgentRequest(req: AgentRequest): Promise<string> {
  const { text, userId, workspaceId } = req

  // Resolve user context for access control
  const user = workspaceId
    ? await resolveUserContext(workspaceId, userId)
    : null

  // Intent resolution: figure out which agent + action to call.
  // This is a simple keyword-based router for now. In the future,
  // Kit's LLM layer will handle intent resolution via the MCP tools.
  const intent = resolveIntent(text)

  if (!intent) {
    // No clear intent — acknowledge and give guidance
    return "I'm not sure what you need. Try asking me about:\n" +
      "• Time tracking (\"log 2 hours on Project X\")\n" +
      "• Project info (\"what's the budget on Project Y\")\n" +
      "• Files (\"find the latest cut for Project Z\")\n" +
      "• Reviews (\"any new comments on the hero video?\")\n" +
      "Or use `/kit newproject` to spin up a new project."
  }

  // Gateway check
  if (user) {
    const access = checkGateway(user, intent.agentId, intent.action)
    if (!access.allowed) {
      return access.reason || "Sorry, that's restricted information."
    }
  }

  // Dispatch to agent
  const result = await dispatch(intent.agentId, intent.action, intent.payload)

  if (!result.success) {
    return `Couldn't complete that: ${result.error || 'unknown error'}`
  }

  // Field-level filtering
  if (user && result.data) {
    result.data = filterResultData(result.data, user)
  }

  // Format response
  return formatAgentResponse(result)
}

// ─── Intent Resolution ──────────────────────────────────────
// Simple pattern matching for common requests. This is the "v1"
// router — Kit's LLM layer will eventually replace this with
// proper NLU using kit_list_agents / kit_ask_agent.

interface ResolvedIntent {
  agentId: string
  action: string
  payload: Record<string, unknown>
}

function resolveIntent(text: string): ResolvedIntent | null {
  const lower = text.toLowerCase()

  // ── Time logging ──────────────────────────────────────────
  if (lower.match(/log\s+\d+(\.\d+)?\s*(hours?|hrs?|h)\b/)) {
    return { agentId: 'harvest', action: 'log_time', payload: { rawText: text } }
  }

  // ── Budget queries ────────────────────────────────────────
  if (lower.match(/budget|spend|burn\s*rate|how much/)) {
    return { agentId: 'harvest', action: 'get_budget', payload: { rawText: text } }
  }

  // ── Project search ────────────────────────────────────────
  if (lower.match(/find project|list projects|what projects|my projects/)) {
    return { agentId: 'harvest', action: 'find_projects', payload: { rawText: text } }
  }

  // ── File search ───────────────────────────────────────────
  if (lower.match(/find|search|latest|where is|locate/) && lower.match(/file|cut|render|export|doc/)) {
    return { agentId: 'dropbox', action: 'search', payload: { query: text } }
  }

  // ── Review comments ───────────────────────────────────────
  if (lower.match(/comment|review|feedback|notes/) && lower.match(/frame|video|asset/)) {
    return { agentId: 'frameio', action: 'get_comments', payload: { rawText: text } }
  }

  // ── Review status ─────────────────────────────────────────
  if (lower.match(/review status|approval|approved|pending review/)) {
    return { agentId: 'frameio', action: 'get_review_status', payload: { rawText: text } }
  }

  // ── Team info ─────────────────────────────────────────────
  if (lower.match(/team|who('s| is) on|members|assigned/)) {
    return { agentId: 'harvest', action: 'get_team', payload: { rawText: text } }
  }

  // ── Channel management ────────────────────────────────────
  if (lower.match(/set topic|change topic|update topic/)) {
    return { agentId: 'slack', action: 'set_topic', payload: { rawText: text } }
  }

  return null
}

// ─── Response Formatting ────────────────────────────────────

function formatAgentResponse(result: any): string {
  // If the agent returned a message, use it
  if (result.message) return result.message

  // Otherwise build a simple response from the data
  if (result.data) {
    // Don't dump raw JSON — give a readable summary
    if (typeof result.data === 'object') {
      const keys = Object.keys(result.data)
      if (keys.length <= 5) {
        return Object.entries(result.data)
          .map(([k, v]) => `*${k}*: ${v}`)
          .join('\n')
      }
      return `Done. Got ${keys.length} fields back from ${result.agent}.`
    }
    return String(result.data)
  }

  return `✓ ${result.agent}:${result.action} completed.`
}

// ─── Helpers ────────────────────────────────────────────────

async function resolveWorkspaceId(teamId: string): Promise<string> {
  if (!teamId) return ''
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('workspaces')
      .select('id, slack_team_id')
      .eq('slack_team_id', teamId)
      .limit(1)
      .single()

    if (data?.id) return data.id

    // Fallback: first workspace (single-tenant dev)
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
