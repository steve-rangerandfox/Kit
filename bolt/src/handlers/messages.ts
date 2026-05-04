// @ts-nocheck
/**
 * Bolt Message Handlers
 *
 * Three paths:
 *   1. Frame.io link detected → handleFrameIoLink (direct, no LLM)
 *   2. Time-entry shorthand detected → handleTimeEntry (direct, no LLM)
 *   3. Everything else → orchestrator (Claude)
 *
 * Triggers:
 *   - app_mention: any @mention in a channel where Kit is invited
 *   - message (DM): any message in a DM with Kit
 *   - message (channel, no mention): only if Kit is awaitingClarification
 *     from this (channel, user) within the TTL — enables follow-ups
 *     without requiring re-@mention.
 *
 * All replies post in the main flow (no thread_ts).
 */

import type { App } from '@slack/bolt'
import { createAdminClient } from '../../../src/lib/supabase/admin'
import { resolveUserContext } from '../../../src/lib/inngest/access-control'
import { messageHasFrameIoLink, handleFrameIoLink } from '../../../src/lib/frameio/slack-handler'
import { isTimeEntryMessage, handleTimeEntry } from '../../../src/lib/harvest/slack-handler'

import { runOrchestrator } from '../llm/orchestrator'
import { hasPendingClarification } from '../llm/memory'
import { setThinking, clearThinking } from '../llm/status'

export function registerMessageHandlers(app: App) {
  // ─── @mentions ────────────────────────────────────────────
  app.event('app_mention', async ({ event, client }) => {
    if (event.bot_id || (event as any).subtype === 'bot_message') return

    const channelId = event.channel
    const messageText = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim()
    const userId = event.user
    const teamId = (event as any).team || ''

    await handleConversationalMessage({
      app,
      channelId,
      userId,
      teamId,
      messageText,
      messageTs: event.ts,
      threadTs: event.thread_ts || event.ts,
      isDirectMention: true,
    })
  })

  // ─── DMs and channel-with-pending-clarification ───────────
  app.event('message', async ({ event }) => {
    const msgEvent = event as any

    // Skip bot/system messages
    if (msgEvent.bot_id || msgEvent.subtype) return

    const isDM = msgEvent.channel_type === 'im'
    const userId = msgEvent.user
    const channelId = msgEvent.channel
    const teamId = msgEvent.team || ''

    // For non-DM messages without @mention, only act if Kit is awaiting clarification
    if (!isDM) {
      if (!hasPendingClarification(teamId, channelId, userId)) return
    }

    // (App_mention event handles the @mention path; ignore mentions here to avoid double-fire)
    if ((msgEvent.text || '').includes('<@') && !isDM) return

    await handleConversationalMessage({
      app,
      channelId,
      userId,
      teamId,
      messageText: (msgEvent.text || '').trim(),
      messageTs: msgEvent.ts,
      threadTs: msgEvent.thread_ts || msgEvent.ts,
      isDirectMention: false,
    })
  })
}

// ─── Shared handler ────────────────────────────────────────
interface HandlerArgs {
  app: App
  channelId: string
  userId: string
  teamId: string
  messageText: string
  messageTs: string
  threadTs: string
  isDirectMention: boolean
}

async function handleConversationalMessage(args: HandlerArgs): Promise<void> {
  const { app, channelId, userId, teamId, messageText, messageTs, threadTs } = args

  if (!messageText) {
    await app.client.chat.postMessage({
      channel: channelId,
      text: "Hey! What can I help you with?",
    })
    return
  }

  // Resolve workspace + user context
  const workspaceId = await resolveWorkspaceId(teamId)
  const user = workspaceId
    ? await resolveUserContext(workspaceId, userId)
    : null

  // ── Fast path 1: Frame.io link ──────────────────────────
  if (messageHasFrameIoLink(messageText)) {
    console.log('[Bolt] Frame.io link detected')
    await handleFrameIoLink({
      text: messageText,
      channelId,
      threadTs,
      messageTs,
      userId,
      workspaceId: workspaceId || '',
    })
    return
  }

  // ── Fast path 2: Time entry shorthand ───────────────────
  if (isTimeEntryMessage(messageText)) {
    console.log('[Bolt] Time-entry shorthand detected')
    await handleTimeEntry({
      text: messageText,
      channelId,
      threadTs,
      messageTs,
      userId,
      workspaceId: workspaceId || '',
    })
    return
  }

  // ── Path 3: Orchestrator ────────────────────────────────
  await setThinking(app, channelId, threadTs, 'thinking…')

  try {
    const { reply } = await runOrchestrator({
      teamId,
      channel: channelId,
      userId,
      user,
      message: messageText,
    })

    await app.client.chat.postMessage({
      channel: channelId,
      text: reply,
    })
  } catch (err: any) {
    console.error('[Bolt] orchestrator error:', err)
    await app.client.chat.postMessage({
      channel: channelId,
      text: "I'm having trouble thinking clearly — try again in a sec?",
    })
  } finally {
    await clearThinking(app, channelId, threadTs)
  }
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
