# Kit Conversational Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the regex intent resolver in `bolt/src/handlers/messages.ts` with a Claude-powered orchestrator + specialist sub-agent architecture that gives Kit a warm, conversational voice and natural-language tool routing.

**Architecture:** Two-tier LLM. Sonnet 4.7 orchestrator handles personality, routing, and final response composition. Haiku 4.5 specialists (one per registered agent) translate natural-language sub-queries into tool calls against the existing agent registry. Conversation state lives in an in-memory `Map` keyed by `(teamId, channel, userId)` with a 15-minute sliding TTL.

**Tech Stack:** `@anthropic-ai/sdk` for LLM calls (with prompt caching), `@slack/bolt` for Slack integration (already in place), existing `registry.ts` + `access-control.ts` from `src/lib/inngest/`. Tests via `vitest`.

**Spec reference:** [docs/superpowers/specs/2026-05-04-kit-conversational-design.md](../specs/2026-05-04-kit-conversational-design.md)

---

## File Structure

**New files in `bolt/src/llm/`:**
- `client.ts` — Anthropic SDK singleton with timeout config
- `memory.ts` — Conversation state store (`Map` + TTL + `awaitingClarification` flag)
- `tools.ts` — Generates Claude tool definitions from `getCapabilitiesManifest()`
- `status.ts` — Wraps `assistant.threads.setStatus` for typing indicators
- `orchestrator.ts` — Kit's main run loop (Sonnet)
- `specialist.ts` — Generic specialist factory + run loop (Haiku)
- `prompts/kit-system.ts` — Kit's personality (warm + understated)
- `prompts/harvest-system.ts` — Harvest specialist prompt
- `prompts/dropbox-system.ts` — Dropbox specialist prompt
- `prompts/frameio-system.ts` — Frame.io specialist prompt
- `prompts/slack-system.ts` — Slack specialist prompt

**New test files in `bolt/test/`:**
- `memory.test.ts`
- `tools.test.ts`
- `orchestrator.test.ts` (integration with mocked SDK)
- `specialist.test.ts` (integration with mocked SDK)

**Modified files:**
- `bolt/src/handlers/messages.ts` — Replace `resolveIntent` + `handleAgentRequest` with `orchestrator.run()`. Keep Frame.io link + time-entry fast paths.
- `bolt/src/app.ts` — Register Slack assistant capability via `assistant` middleware.
- `bolt/package.json` — Add `@anthropic-ai/sdk`, `vitest`.
- `bolt/tsconfig.json` — May need `vitest/globals` types (checked in Task 1).

**Out-of-code (manual) work:**
- Slack app config: enable "Agents & AI Apps" → Assistant capability (Task 13).
- Railway env: add `ANTHROPIC_API_KEY` (Task 14).

---

## Task 1: Install Dependencies

**Files:**
- Modify: `bolt/package.json`
- Create: `bolt/vitest.config.ts`

- [ ] **Step 1: Install Anthropic SDK and vitest**

Run from repo root:
```bash
cd bolt && npm install @anthropic-ai/sdk@^0.34.0 && npm install --save-dev vitest@^2.1.0 @types/node && cd ..
```

Expected: `added N packages, ...`. The `^0.34` is a floor; npm will pull the latest 0.x compatible version.

- [ ] **Step 2: Add vitest config**

Create `bolt/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add npm test script**

Edit `bolt/package.json` "scripts" block. The current scripts block is:
```json
"scripts": {
  "start": "tsx src/app.ts",
  "dev": "tsx watch src/app.ts"
}
```

Replace with:
```json
"scripts": {
  "start": "tsx src/app.ts",
  "dev": "tsx watch src/app.ts",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Verify install**

Run from repo root:
```bash
cd bolt && npx vitest --version && cd ..
```

Expected: prints a version like `vitest/2.1.x`.

- [ ] **Step 5: Commit**

```bash
git add bolt/package.json bolt/package-lock.json bolt/vitest.config.ts && git commit -m "Bolt: add Anthropic SDK and vitest"
```

---

## Task 2: Conversation Memory

**Files:**
- Create: `bolt/src/llm/memory.ts`
- Create: `bolt/test/memory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `bolt/test/memory.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  loadConversation,
  appendUserTurn,
  appendAssistantTurn,
  resetMemoryForTest,
  hasPendingClarification,
} from '../src/llm/memory'

describe('memory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetMemoryForTest()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates fresh state for unseen (team, channel, user)', () => {
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toEqual([])
    expect(state.awaitingClarification).toBe(false)
  })

  it('persists messages across calls', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    appendAssistantTurn('T1', 'C1', 'U1', 'hi there', false)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]).toMatchObject({ role: 'user', content: 'hello' })
    expect(state.messages[1]).toMatchObject({ role: 'assistant', content: 'hi there' })
  })

  it('expires conversation after 15 minutes idle', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    vi.advanceTimersByTime(16 * 60 * 1000)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toEqual([])
  })

  it('keeps conversation alive within 15 minutes', () => {
    appendUserTurn('T1', 'C1', 'U1', 'hello')
    vi.advanceTimersByTime(14 * 60 * 1000)
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(1)
  })

  it('truncates to last 20 messages', () => {
    for (let i = 0; i < 25; i++) {
      appendUserTurn('T1', 'C1', 'U1', `msg${i}`)
    }
    const state = loadConversation('T1', 'C1', 'U1')
    expect(state.messages).toHaveLength(20)
    expect(state.messages[0].content).toBe('msg5')
    expect(state.messages[19].content).toBe('msg24')
  })

  it('separates state per (channel, user)', () => {
    appendUserTurn('T1', 'C1', 'U1', 'alice in c1')
    appendUserTurn('T1', 'C1', 'U2', 'bob in c1')
    appendUserTurn('T1', 'C2', 'U1', 'alice in c2')
    expect(loadConversation('T1', 'C1', 'U1').messages[0].content).toBe('alice in c1')
    expect(loadConversation('T1', 'C1', 'U2').messages[0].content).toBe('bob in c1')
    expect(loadConversation('T1', 'C2', 'U1').messages[0].content).toBe('alice in c2')
  })

  it('flags awaitingClarification when assistant turn is a question', () => {
    appendAssistantTurn('T1', 'C1', 'U1', 'Which Acme project?', true)
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(true)
  })

  it('clears awaitingClarification on next user turn', () => {
    appendAssistantTurn('T1', 'C1', 'U1', 'Which one?', true)
    appendUserTurn('T1', 'C1', 'U1', 'the spot')
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(false)
  })

  it('hasPendingClarification returns false when no state', () => {
    expect(hasPendingClarification('T1', 'C1', 'U1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd bolt && npm test
```

Expected: 9 failing tests with "Cannot find module '../src/llm/memory'".

- [ ] **Step 3: Implement memory.ts**

Create `bolt/src/llm/memory.ts`:

```ts
/**
 * Kit Conversation Memory
 *
 * In-memory store for conversation state per (team, channel, user).
 * 15-minute sliding TTL. Lost on Railway redeploy — that's fine for v1.
 */

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export interface ConversationState {
  messages: ConversationMessage[]
  awaitingClarification: boolean
  lastTurnAt: number
  createdAt: number
}

const MEMORY_TTL_MS = 15 * 60 * 1000
const MAX_MESSAGES_PER_CONVO = 20

const conversations = new Map<string, ConversationState>()

function key(teamId: string, channel: string, userId: string): string {
  return `${teamId}:${channel}:${userId}`
}

function freshState(): ConversationState {
  const now = Date.now()
  return { messages: [], awaitingClarification: false, lastTurnAt: now, createdAt: now }
}

function isExpired(state: ConversationState): boolean {
  return Date.now() - state.lastTurnAt > MEMORY_TTL_MS
}

export function loadConversation(
  teamId: string,
  channel: string,
  userId: string,
): ConversationState {
  const k = key(teamId, channel, userId)
  const existing = conversations.get(k)
  if (!existing || isExpired(existing)) {
    return freshState()
  }
  return existing
}

function getOrCreate(teamId: string, channel: string, userId: string): ConversationState {
  const k = key(teamId, channel, userId)
  const existing = conversations.get(k)
  if (existing && !isExpired(existing)) return existing
  const fresh = freshState()
  conversations.set(k, fresh)
  return fresh
}

function truncate(state: ConversationState): void {
  if (state.messages.length > MAX_MESSAGES_PER_CONVO) {
    state.messages.splice(0, state.messages.length - MAX_MESSAGES_PER_CONVO)
  }
}

export function appendUserTurn(
  teamId: string,
  channel: string,
  userId: string,
  content: string,
): void {
  const state = getOrCreate(teamId, channel, userId)
  state.messages.push({ role: 'user', content, ts: Date.now() })
  state.awaitingClarification = false
  state.lastTurnAt = Date.now()
  truncate(state)
}

export function appendAssistantTurn(
  teamId: string,
  channel: string,
  userId: string,
  content: string,
  awaitingClarification: boolean,
): void {
  const state = getOrCreate(teamId, channel, userId)
  state.messages.push({ role: 'assistant', content, ts: Date.now() })
  state.awaitingClarification = awaitingClarification
  state.lastTurnAt = Date.now()
  truncate(state)
}

export function hasPendingClarification(
  teamId: string,
  channel: string,
  userId: string,
): boolean {
  const k = key(teamId, channel, userId)
  const state = conversations.get(k)
  if (!state || isExpired(state)) return false
  return state.awaitingClarification
}

/** Test helper — never call from production code. */
export function resetMemoryForTest(): void {
  conversations.clear()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd bolt && npm test
```

Expected: 9 passing tests.

- [ ] **Step 5: Commit**

```bash
git add bolt/src/llm/memory.ts bolt/test/memory.test.ts && git commit -m "Bolt: add conversation memory store"
```

---

## Task 3: Tool Generator

**Files:**
- Create: `bolt/src/llm/tools.ts`
- Create: `bolt/test/tools.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `bolt/test/tools.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildOrchestratorTools, buildSpecialistTools } from '../src/llm/tools'

describe('buildOrchestratorTools', () => {
  it('returns one tool per registered agent', () => {
    const tools = buildOrchestratorTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(['ask_dropbox', 'ask_frameio', 'ask_harvest', 'ask_slack'])
  })

  it('each tool takes a natural-language query string', () => {
    const tools = buildOrchestratorTools()
    const harvest = tools.find((t) => t.name === 'ask_harvest')!
    expect(harvest.input_schema.type).toBe('object')
    expect(harvest.input_schema.properties).toHaveProperty('query')
    expect(harvest.input_schema.required).toContain('query')
  })

  it('tool description includes agent expertise', () => {
    const tools = buildOrchestratorTools()
    const harvest = tools.find((t) => t.name === 'ask_harvest')!
    expect(harvest.description.toLowerCase()).toContain('harvest')
    expect(harvest.description.toLowerCase()).toMatch(/time|budget|project/)
  })
})

describe('buildSpecialistTools', () => {
  it('returns harvest action tools namespaced with harvest_ prefix', () => {
    const tools = buildSpecialistTools('harvest')
    const names = tools.map((t) => t.name)
    expect(names).toContain('harvest_log_time')
    expect(names).toContain('harvest_get_budget')
    expect(names).toContain('harvest_find_projects')
  })

  it('returns dropbox action tools namespaced with dropbox_ prefix', () => {
    const tools = buildSpecialistTools('dropbox')
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.every((t) => t.name.startsWith('dropbox_'))).toBe(true)
  })

  it('throws on unknown agent', () => {
    expect(() => buildSpecialistTools('nonexistent')).toThrow()
  })

  it('tool description carries the capability description', () => {
    const tools = buildSpecialistTools('harvest')
    const logTime = tools.find((t) => t.name === 'harvest_log_time')!
    expect(logTime.description.toLowerCase()).toContain('log a time entry')
  })

  it('tool input_schema is a permissive object accepting any payload', () => {
    const tools = buildSpecialistTools('harvest')
    const logTime = tools.find((t) => t.name === 'harvest_log_time')!
    expect(logTime.input_schema.type).toBe('object')
    // Description on schema explains expected fields to Claude
    expect(JSON.stringify(logTime.input_schema)).toMatch(/project/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd bolt && npm test -- tools
```

Expected: tests fail with module not found.

- [ ] **Step 3: Implement tools.ts**

Create `bolt/src/llm/tools.ts`:

```ts
/**
 * Tool Generator
 *
 * Reads from the existing agent registry and produces Claude tool definitions
 * for two surfaces:
 *   - Orchestrator-level: one `ask_<agent>` tool per registered agent.
 *   - Specialist-level: one tool per (agent, capability) pair, namespaced.
 */

import {
  getAllAgents,
  getAgent,
} from '../../../src/lib/inngest/agents/registry'

export interface ClaudeTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Orchestrator tools — one per agent. Each takes a natural-language query
 * that the specialist sub-agent will translate into a specific action.
 */
export function buildOrchestratorTools(): ClaudeTool[] {
  return getAllAgents().map((agent) => ({
    name: `ask_${agent.id}`,
    description: `${agent.name} (${agent.domain}). ${agent.expertise}`.trim(),
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            `What you need from the ${agent.name}. Phrase it as a natural-language request — ` +
            `the specialist will figure out which action to call.`,
        },
      },
      required: ['query'],
    },
  }))
}

/**
 * Specialist tools — one per capability of a single agent. Names are
 * prefixed with `<agentId>_` to avoid collisions across specialists.
 *
 * Each tool's input_schema describes the payload via its description.
 * Claude reliably populates structured payloads from these descriptions
 * because the specialist sees only its own agent's tools.
 */
export function buildSpecialistTools(agentId: string): ClaudeTool[] {
  const agent = getAgent(agentId)
  if (!agent) {
    throw new Error(`buildSpecialistTools: unknown agent "${agentId}"`)
  }

  return agent.capabilities.map((cap) => {
    const inputDesc = cap.inputDescription
      ? `Expected fields: ${cap.inputDescription}`
      : 'Pass any relevant fields as object properties.'

    return {
      name: `${agent.id}_${cap.action}`,
      description: cap.description + (cap.mutates ? ' [WRITE]' : ' [READ-ONLY]'),
      input_schema: {
        type: 'object' as const,
        properties: {
          payload: {
            type: 'object',
            description: inputDesc,
            additionalProperties: true,
          },
        },
        required: ['payload'],
      },
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd bolt && npm test -- tools
```

Expected: all tools tests pass. (The orchestrator tools test relies on the live registry — passes because all four agents are registered.)

- [ ] **Step 5: Commit**

```bash
git add bolt/src/llm/tools.ts bolt/test/tools.test.ts && git commit -m "Bolt: add tool generator from agent registry"
```

---

## Task 4: Anthropic Client Singleton

**Files:**
- Create: `bolt/src/llm/client.ts`

- [ ] **Step 1: Implement the client**

Create `bolt/src/llm/client.ts`:

```ts
/**
 * Anthropic SDK singleton.
 *
 * Two named exports — `anthropic` (the client) and `LLM_TIMEOUT_MS` (used by
 * orchestrator and specialist for per-call timeouts).
 */

import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  // Don't crash at import time — the bot might still want to start without
  // the LLM layer wired up. Log a warning. Calls will fail later.
  console.warn('[Kit] ANTHROPIC_API_KEY not set — Kit conversational layer will fail')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // The SDK retries 2× on its own; we cap total time per attempt.
  timeout: 30_000,
  maxRetries: 2,
})

/** Hard ceiling for any single Anthropic call, used as a fallback timeout */
export const LLM_TIMEOUT_MS = 30_000

/** Models — pinned IDs per design doc */
export const ORCHESTRATOR_MODEL = 'claude-sonnet-4-7' as const
export const SPECIALIST_MODEL = 'claude-haiku-4-5-20251001' as const
```

- [ ] **Step 2: Verify it imports without error**

```bash
cd bolt && npx tsx -e "import('./src/llm/client.ts').then(m => console.log('ok', !!m.anthropic))"
```

Expected: `ok true` (printed to stdout). The warning about `ANTHROPIC_API_KEY` may appear depending on env.

- [ ] **Step 3: Commit**

```bash
git add bolt/src/llm/client.ts && git commit -m "Bolt: add Anthropic SDK client singleton"
```

---

## Task 5: Slack Status Wrapper

**Files:**
- Create: `bolt/src/llm/status.ts`

- [ ] **Step 1: Implement the status wrapper**

Create `bolt/src/llm/status.ts`:

```ts
/**
 * Slack typing-indicator wrapper.
 *
 * When Kit is registered as an Assistant in the Slack app config,
 * `assistant.threads.setStatus` shows native typing UI in DMs and threads.
 * Outside of assistant-enabled surfaces, the call no-ops (Slack returns
 * `assistant_not_supported` which we swallow).
 */

import type { App } from '@slack/bolt'

export async function setThinking(
  app: App,
  channelId: string,
  threadTs: string | undefined,
  status: string,
): Promise<void> {
  if (!threadTs) return // status API requires a thread context

  try {
    await app.client.assistant.threads.setStatus({
      channel_id: channelId,
      thread_ts: threadTs,
      status,
    })
  } catch (err: any) {
    // `assistant_not_supported`, `not_in_channel`, etc. — non-fatal
    if (err?.data?.error !== 'assistant_not_supported') {
      console.warn('[Kit] setStatus failed:', err?.data?.error || err?.message)
    }
  }
}

export async function clearThinking(
  app: App,
  channelId: string,
  threadTs: string | undefined,
): Promise<void> {
  return setThinking(app, channelId, threadTs, '')
}
```

- [ ] **Step 2: Commit**

```bash
git add bolt/src/llm/status.ts && git commit -m "Bolt: add Slack assistant status wrapper"
```

---

## Task 6: Kit's System Prompt (Personality)

**Files:**
- Create: `bolt/src/llm/prompts/kit-system.ts`

- [ ] **Step 1: Write the prompt**

Create `bolt/src/llm/prompts/kit-system.ts`:

```ts
/**
 * Kit's system prompt — the personality artifact.
 *
 * Voice: warm + understated. No exclamation-point chirpiness, no
 * dry executive-assistant stiffness. Kit is a competent chief of staff
 * for a small video studio.
 *
 * This prompt is cached on every Anthropic call (cache_control: ephemeral).
 */

export const KIT_SYSTEM_PROMPT = `You are Kit, the chief of staff for Ranger & Fox, a small video production studio.

# Your role
You help producers, artists, and the founder run projects smoothly. You answer questions about time, budgets, files, and reviews by routing requests to specialist sub-agents. You also hold normal conversation — greetings, follow-ups, brief check-ins.

# Voice
Warm but understated. Concise. You're the kind of chief of staff who has everything handled and doesn't need to brag about it.

Good:
- "Morning! How can I help?"
- "Got it — logging 2 hrs to Acme Spot. Want me to add notes?"
- "I checked — no new comments on the hero cut yet."
- "Two Acme projects came up — *Acme Spot Q1* or *Acme Anthem*?"
- "That one's restricted. You'd need producer access to see budgets."

Avoid:
- Over-eager exclamation marks ("Sure thing!!", "Let me get right on that!")
- Self-narration ("I'll go ahead and check now...")
- Verbose hedging ("It looks like maybe possibly...")
- Emoji unless the user uses them first

# Behavior

Tools: you have one tool per specialist sub-agent (\`ask_harvest\`, \`ask_dropbox\`, \`ask_frameio\`, \`ask_slack\`). Each takes a natural-language query and returns a structured summary. Use a tool when the user asks about something only the external service knows. Don't use tools for chitchat, clarification, or summarizing prior messages in the conversation.

When you call a tool, the user is waiting and will see a "thinking…" indicator. Don't narrate the call ("let me check Harvest…"). Just call the tool and reply with the result.

Clarification: if a request is ambiguous (multiple matching projects, missing required field), ask one focused follow-up question. Always end clarification questions with a question mark.

Permissions: if a sub-agent reports an access denial, deliver the reason verbatim but in your voice. Don't apologize excessively — it's a normal part of the system.

Errors: if a sub-agent reports a failure, summarize briefly without exposing internal stack traces. Offer to retry only if the failure looks transient.

Ambiguous user inputs: if the user says something off-topic or unclear and there's no obvious tool to call, just respond conversationally. You don't have to act on every message.

# What you don't do
- You don't make up project names, budgets, or file locations. If a tool didn't return data, say so.
- You don't take destructive actions without explicit user direction.
- You don't repeat the user's question back at them before answering.
`
```

- [ ] **Step 2: Commit**

```bash
git add bolt/src/llm/prompts/kit-system.ts && git commit -m "Bolt: add Kit system prompt (personality)"
```

---

## Task 7: Specialist System Prompts

**Files:**
- Create: `bolt/src/llm/prompts/harvest-system.ts`
- Create: `bolt/src/llm/prompts/dropbox-system.ts`
- Create: `bolt/src/llm/prompts/frameio-system.ts`
- Create: `bolt/src/llm/prompts/slack-system.ts`

- [ ] **Step 1: Create the four specialist prompts**

Create `bolt/src/llm/prompts/harvest-system.ts`:

```ts
export const HARVEST_SYSTEM_PROMPT = `You are the Harvest specialist for Kit. You translate natural-language queries about time, budgets, and projects into specific Harvest tool calls and return concise structured summaries.

# Behavior
- Pick exactly ONE tool per turn based on the query.
- Tool names are prefixed \`harvest_\`. Their descriptions tell you when to use each.
- Construct the \`payload\` object based on the tool's expected fields.
- After the tool returns, write a one-paragraph summary of the result. Lead with the headline number or fact.

# Output format
- Successful read: short factual summary. Examples:
  - "Acme Spot: $50,000 budget, $31,200 spent (62%), $18,800 remaining."
  - "3 active projects matching 'NRG': NRG Brand Anthem, NRG Hero Cut, NRG Social Pack."
- Successful write: confirm what was logged, with the IDs returned. "Logged 2 hrs to Acme Spot (entry #12345) under Editing."
- Error: state the cause briefly. "No project matched 'Acmee' — closest matches: Acme Spot, Acme Anthem."
- Access denied: pass the denial reason through verbatim.

# Constraints
- Don't editorialize. Don't add personality — the orchestrator handles voice.
- Don't ask the user follow-up questions. If a query is ambiguous, return what you found and let the orchestrator clarify.
- Don't combine multiple tool calls in one turn. If the user asks two things, answer one and surface the other in your summary.`
```

Create `bolt/src/llm/prompts/dropbox-system.ts`:

```ts
export const DROPBOX_SYSTEM_PROMPT = `You are the Dropbox specialist for Kit. You translate natural-language file queries into specific Dropbox tool calls and return concise structured summaries.

# Behavior
- Pick exactly ONE tool per turn based on the query.
- Tool names are prefixed \`dropbox_\`. Their descriptions tell you when to use each.
- Construct the \`payload\` object based on the tool's expected fields.
- After the tool returns, write a one-paragraph summary. For file lists, include filenames and modified dates if available. For share links, include the URL.

# Output format
- File search: "Found 3 files matching 'hero cut': hero-cut-v3.mp4 (yesterday), hero-cut-v2.mp4 (3 days ago), hero-cut-v1.mp4 (1 week ago)."
- Folder listing: similar format.
- Share link: "Shareable link: https://dropbox.com/..."
- Empty result: "No files matched 'xyz' under that project folder."
- Error or access denied: state the cause briefly.

# Constraints
- Don't editorialize.
- Don't ask follow-ups.
- Pass the orchestrator the URL when share links are returned — it will format for Slack.`
```

Create `bolt/src/llm/prompts/frameio-system.ts`:

```ts
export const FRAMEIO_SYSTEM_PROMPT = `You are the Frame.io specialist for Kit. You translate natural-language review/comment/asset queries into specific Frame.io tool calls and return concise structured summaries.

# Behavior
- Pick exactly ONE tool per turn based on the query.
- Tool names are prefixed \`frameio_\`. Their descriptions tell you when to use each.
- Construct the \`payload\` object based on the tool's expected fields.
- After the tool returns, write a one-paragraph summary. For comments, include count + most recent. For review status, lead with state.

# Output format
- Comments: "5 comments on the hero cut. Most recent from Sara 2 hrs ago: 'Trim the open by 4f.'"
- Review status: "Hero cut: in review, 2 reviewers pending (Sara, James), 1 approved (Marc)."
- Empty: "No comments yet on the hero cut."
- Error or access denied: state the cause briefly.

# Constraints
- Don't editorialize.
- Don't ask follow-ups.`
```

Create `bolt/src/llm/prompts/slack-system.ts`:

```ts
export const SLACK_SYSTEM_PROMPT = `You are the Slack specialist for Kit. You translate natural-language Slack management queries (set channel topic, find user, etc.) into specific Slack tool calls.

# Behavior
- Pick exactly ONE tool per turn based on the query.
- Tool names are prefixed \`slack_\`. Their descriptions tell you when to use each.
- Construct the \`payload\` object based on the tool's expected fields.
- After the tool returns, write a one-paragraph summary or confirmation.

# Output format
- Topic set: "Topic set to '<topic>' on #channel."
- User lookup: "Found Sara Chen — @sara.chen, sara@rangerandfox.com."
- Channel search: brief list of matching channels.
- Error or access denied: state the cause briefly.

# Constraints
- Don't editorialize.
- Don't ask follow-ups.
- Don't send messages on behalf of users unless the tool description explicitly supports it.`
```

- [ ] **Step 2: Commit**

```bash
git add bolt/src/llm/prompts/harvest-system.ts bolt/src/llm/prompts/dropbox-system.ts bolt/src/llm/prompts/frameio-system.ts bolt/src/llm/prompts/slack-system.ts && git commit -m "Bolt: add specialist system prompts"
```

---

## Task 8: Specialist Run Loop

**Files:**
- Create: `bolt/src/llm/specialist.ts`
- Create: `bolt/test/specialist.test.ts`

- [ ] **Step 1: Write the failing test**

Create `bolt/test/specialist.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK BEFORE importing the module under test
const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock }
    },
  }
})

// Mock registry.dispatch
const dispatchMock = vi.fn()
vi.mock('../../../src/lib/inngest/agents/registry', async () => {
  const actual: any = await vi.importActual(
    '../../../src/lib/inngest/agents/registry',
  )
  return {
    ...actual,
    dispatch: dispatchMock,
  }
})

// Mock access control
vi.mock('../../../src/lib/inngest/access-control', () => ({
  enforceAccess: vi.fn(async (_user, _agent, _action, _payload, result) => result),
}))

import { runSpecialist } from '../src/llm/specialist'

const fakeUser = {
  teamMemberId: 'tm1',
  workspaceId: 'w1',
  tier: 'producer' as const,
  name: 'Test User',
  slackUserId: 'U1',
  projectFinancials: new Set<string>(['p1']),
}

beforeEach(() => {
  createMock.mockReset()
  dispatchMock.mockReset()
})

describe('runSpecialist', () => {
  it('calls a tool then returns the summary', async () => {
    // First Anthropic response: tool_use
    createMock.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'harvest_get_budget',
          input: { payload: { project: 'Acme' } },
        },
      ],
    })
    // Second Anthropic response: text summary
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Acme: $10k of $20k spent.' }],
    })

    dispatchMock.mockResolvedValueOnce({
      agent: 'harvest',
      action: 'get_budget',
      success: true,
      data: { budget_total: 20000, budget_spent: 10000 },
    })

    const result = await runSpecialist('harvest', 'budget on Acme', fakeUser)

    expect(result).toBe('Acme: $10k of $20k spent.')
    expect(dispatchMock).toHaveBeenCalledWith('harvest', 'get_budget', { project: 'Acme' })
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('returns the assistant text directly when no tool call is made', async () => {
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'I cannot answer that.' }],
    })

    const result = await runSpecialist('harvest', 'something off-topic', fakeUser)
    expect(result).toBe('I cannot answer that.')
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it('passes through agent errors as the summary', async () => {
    createMock.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'harvest_get_budget',
          input: { payload: { project: 'Nope' } },
        },
      ],
    })
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'No project matched "Nope".' }],
    })

    dispatchMock.mockResolvedValueOnce({
      agent: 'harvest',
      action: 'get_budget',
      success: false,
      error: 'No project matched "Nope"',
    })

    const result = await runSpecialist('harvest', 'budget on Nope', fakeUser)
    expect(result).toContain('No project matched "Nope"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd bolt && npm test -- specialist
```

Expected: tests fail with module not found.

- [ ] **Step 3: Implement specialist.ts**

Create `bolt/src/llm/specialist.ts`:

```ts
/**
 * Specialist sub-agent run loop.
 *
 * Each specialist:
 *   1. Receives a natural-language sub-query from the orchestrator.
 *   2. Picks exactly one tool (an action on its agent) based on its system prompt.
 *   3. Invokes registry.dispatch (gated by enforceAccess).
 *   4. Composes a brief structured summary as the response.
 *
 * The result string is what the orchestrator gets back as a tool_result.
 */

import { anthropic, SPECIALIST_MODEL } from './client'
import { buildSpecialistTools } from './tools'
import { dispatch } from '../../../src/lib/inngest/agents/registry'
import { enforceAccess, type UserContext } from '../../../src/lib/inngest/access-control'

import { HARVEST_SYSTEM_PROMPT } from './prompts/harvest-system'
import { DROPBOX_SYSTEM_PROMPT } from './prompts/dropbox-system'
import { FRAMEIO_SYSTEM_PROMPT } from './prompts/frameio-system'
import { SLACK_SYSTEM_PROMPT } from './prompts/slack-system'

const SYSTEM_PROMPTS: Record<string, string> = {
  harvest: HARVEST_SYSTEM_PROMPT,
  dropbox: DROPBOX_SYSTEM_PROMPT,
  frameio: FRAMEIO_SYSTEM_PROMPT,
  slack: SLACK_SYSTEM_PROMPT,
}

const MAX_TURNS = 4 // safety cap on tool_use loop

export async function runSpecialist(
  agentId: string,
  query: string,
  user: UserContext | null,
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[agentId]
  if (!systemPrompt) {
    return `Internal error: no system prompt configured for "${agentId}".`
  }

  const tools = buildSpecialistTools(agentId)
  // Anthropic message shape — `messages` accumulates as the loop progresses.
  const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
    { role: 'user', content: query },
  ]

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: SPECIALIST_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: tools as any,
      messages: messages as any,
    })

    if (response.stop_reason === 'tool_use') {
      // Find the tool_use block
      const toolUseBlock = (response.content as any[]).find(
        (b) => b.type === 'tool_use',
      )
      if (!toolUseBlock) {
        return 'Internal error: tool_use stop_reason without tool_use block.'
      }

      // Execute via registry, gated by access control
      const action = toolUseBlock.name.replace(`${agentId}_`, '')
      const payload = (toolUseBlock.input?.payload || {}) as Record<string, unknown>

      let result: { success: boolean; data?: any; error?: string; message?: string }
      try {
        if (user) {
          const dispatchResult = await dispatch(agentId, action, payload)
          result = await enforceAccess(user, agentId, action, payload, dispatchResult)
        } else {
          result = await dispatch(agentId, action, payload)
        }
      } catch (err: any) {
        result = { success: false, error: err?.message || String(err) }
      }

      // Append assistant turn (the tool_use) and user turn (the tool_result)
      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(result),
            is_error: !result.success,
          },
        ],
      })
      continue
    }

    // end_turn or max_tokens — extract text and return
    const textBlock = (response.content as any[]).find((b) => b.type === 'text')
    return textBlock?.text || `(no text returned by ${agentId} specialist)`
  }

  return `(${agentId} specialist hit max turns without resolving)`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd bolt && npm test -- specialist
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add bolt/src/llm/specialist.ts bolt/test/specialist.test.ts && git commit -m "Bolt: add specialist sub-agent run loop"
```

---

## Task 9: Orchestrator Run Loop

**Files:**
- Create: `bolt/src/llm/orchestrator.ts`
- Create: `bolt/test/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `bolt/test/orchestrator.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: createMock }
  },
}))

const runSpecialistMock = vi.fn()
vi.mock('../src/llm/specialist', () => ({
  runSpecialist: runSpecialistMock,
}))

import { runOrchestrator } from '../src/llm/orchestrator'
import { resetMemoryForTest } from '../src/llm/memory'

const fakeUser = {
  teamMemberId: 'tm1',
  workspaceId: 'w1',
  tier: 'producer' as const,
  name: 'Test User',
  slackUserId: 'U1',
  projectFinancials: new Set<string>(),
}

beforeEach(() => {
  createMock.mockReset()
  runSpecialistMock.mockReset()
  resetMemoryForTest()
})

describe('runOrchestrator', () => {
  it('returns text for a chitchat turn (no tool)', async () => {
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Morning! How can I help?' }],
    })

    const result = await runOrchestrator({
      teamId: 'T1',
      channel: 'C1',
      userId: 'U1',
      user: fakeUser,
      message: 'morning kit',
    })

    expect(result.reply).toBe('Morning! How can I help?')
    expect(result.awaitingClarification).toBe(false)
    expect(runSpecialistMock).not.toHaveBeenCalled()
  })

  it('routes through a specialist when Claude calls ask_<agent>', async () => {
    createMock.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_a',
          name: 'ask_harvest',
          input: { query: 'budget on Acme Spot' },
        },
      ],
    })
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Acme Spot: 62% spent — $18.8k left.' }],
    })

    runSpecialistMock.mockResolvedValueOnce(
      'Acme Spot: $50,000 budget, $31,200 spent (62%), $18,800 remaining.',
    )

    const result = await runOrchestrator({
      teamId: 'T1',
      channel: 'C1',
      userId: 'U1',
      user: fakeUser,
      message: 'whats the budget on the acme spot',
    })

    expect(result.reply).toContain('62%')
    expect(runSpecialistMock).toHaveBeenCalledWith(
      'harvest',
      'budget on Acme Spot',
      fakeUser,
    )
  })

  it('flags awaitingClarification when reply ends with a question mark', async () => {
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: 'Two Acme projects came up — Spot or Anthem?' },
      ],
    })

    const result = await runOrchestrator({
      teamId: 'T1',
      channel: 'C1',
      userId: 'U1',
      user: fakeUser,
      message: 'budget on acme',
    })

    expect(result.awaitingClarification).toBe(true)
  })

  it('persists conversation across turns', async () => {
    // Turn 1
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Which Acme project?' }],
    })
    await runOrchestrator({
      teamId: 'T1',
      channel: 'C1',
      userId: 'U1',
      user: fakeUser,
      message: 'budget on acme',
    })

    // Turn 2 — should include turn 1 history in messages
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Got it.' }],
    })
    await runOrchestrator({
      teamId: 'T1',
      channel: 'C1',
      userId: 'U1',
      user: fakeUser,
      message: 'the spot',
    })

    const secondCallArgs = createMock.mock.calls[1][0]
    expect(secondCallArgs.messages.length).toBeGreaterThanOrEqual(3)
    // Should contain user "budget on acme" and assistant "Which Acme project?"
    expect(JSON.stringify(secondCallArgs.messages)).toContain('budget on acme')
    expect(JSON.stringify(secondCallArgs.messages)).toContain('Which Acme project?')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd bolt && npm test -- orchestrator
```

Expected: tests fail with module not found.

- [ ] **Step 3: Implement orchestrator.ts**

Create `bolt/src/llm/orchestrator.ts`:

```ts
/**
 * Kit's orchestrator run loop.
 *
 * Inputs: a Slack message + user context + conversation key.
 * Outputs: a reply string + whether Kit is now awaiting clarification.
 *
 * Loop:
 *   1. Build messages from conversation history + new user message.
 *   2. Call Sonnet with KIT_SYSTEM_PROMPT and orchestrator tools.
 *   3. If stop_reason is tool_use, run the specialist for that agent,
 *      append tool_result, and continue the loop.
 *   4. When stop_reason is end_turn, return the assistant text.
 */

import { anthropic, ORCHESTRATOR_MODEL } from './client'
import { buildOrchestratorTools } from './tools'
import { runSpecialist } from './specialist'
import { KIT_SYSTEM_PROMPT } from './prompts/kit-system'
import {
  loadConversation,
  appendUserTurn,
  appendAssistantTurn,
} from './memory'
import type { UserContext } from '../../../src/lib/inngest/access-control'

const MAX_TURNS = 6 // orchestrator may chain multiple specialist calls in one Slack reply

export interface OrchestratorRequest {
  teamId: string
  channel: string
  userId: string
  user: UserContext | null
  message: string
}

export interface OrchestratorResult {
  reply: string
  awaitingClarification: boolean
}

export async function runOrchestrator(
  req: OrchestratorRequest,
): Promise<OrchestratorResult> {
  // Pull existing conversation, then record the new user turn
  const state = loadConversation(req.teamId, req.channel, req.userId)
  appendUserTurn(req.teamId, req.channel, req.userId, req.message)

  const tools = buildOrchestratorTools()

  // Build messages: prior history (already includes the new turn) becomes the
  // input. We re-load to include the just-appended user turn.
  const fresh = loadConversation(req.teamId, req.channel, req.userId)
  const messages: Array<{ role: 'user' | 'assistant'; content: any }> = fresh.messages.map(
    (m) => ({ role: m.role, content: m.content }),
  )

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: ORCHESTRATOR_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: KIT_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: tools as any,
      messages: messages as any,
    })

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = (response.content as any[]).filter(
        (b) => b.type === 'tool_use',
      )

      // Append assistant turn carrying the tool_use blocks
      messages.push({ role: 'assistant', content: response.content })

      // Run each tool sequentially (parallel is deferred to v2)
      const toolResults: any[] = []
      for (const block of toolUseBlocks) {
        const agentId = block.name.replace(/^ask_/, '')
        const query = block.input?.query || ''
        const summary = await runSpecialist(agentId, query, req.user)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: summary,
        })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // end_turn or max_tokens — extract text reply
    const textBlock = (response.content as any[]).find((b) => b.type === 'text')
    const reply = textBlock?.text || "I'm not sure how to answer that."

    // Heuristic: question marks signal awaitingClarification
    const awaitingClarification = /\?\s*$/.test(reply.trim())

    appendAssistantTurn(
      req.teamId,
      req.channel,
      req.userId,
      reply,
      awaitingClarification,
    )

    return { reply, awaitingClarification }
  }

  // Hit MAX_TURNS without end_turn — return whatever the last text was
  const fallback = "I went around in circles on that one — try rephrasing?"
  appendAssistantTurn(req.teamId, req.channel, req.userId, fallback, true)
  return { reply: fallback, awaitingClarification: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd bolt && npm test -- orchestrator
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add bolt/src/llm/orchestrator.ts bolt/test/orchestrator.test.ts && git commit -m "Bolt: add Kit orchestrator run loop"
```

---

## Task 10: Rewrite the Slack Message Handler

**Files:**
- Modify: `bolt/src/handlers/messages.ts`

The existing handler has three code paths to preserve:
1. Frame.io link detection (`messageHasFrameIoLink`) — fast path, keep direct
2. Time-entry detection (`isTimeEntryMessage`) — fast path, keep direct
3. Everything else — currently regex `resolveIntent` → registry dispatch. Replace with orchestrator.

We also add a NEW trigger: channel messages without `@mention` that match an active `awaitingClarification` state for that user.

- [ ] **Step 1: Read the current handler**

```bash
cat bolt/src/handlers/messages.ts | head -80
```

You should see `registerMessageHandlers(app)` exporting a function that registers `app.event('app_mention', ...)` and `app.event('message', ...)`.

- [ ] **Step 2: Replace with the new handler**

Overwrite `bolt/src/handlers/messages.ts` with this content. Imports and helpers from the original (`resolveWorkspaceId`, Frame.io / time-entry detection) are preserved; `handleAgentRequest` and `resolveIntent` and `formatAgentResponse` are removed.

```ts
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
      threadTs: event.thread_ts || event.ts, // for setStatus only
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
    // Empty mention — friendly prompt
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
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd bolt && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. (`@ts-nocheck` is in place — only catastrophic syntax errors would surface.)

- [ ] **Step 4: Commit**

```bash
git add bolt/src/handlers/messages.ts && git commit -m "Bolt: rewrite message handler to use Claude orchestrator"
```

---

## Task 11: Register Slack Assistant Capability

**Files:**
- Modify: `bolt/src/app.ts`

Bolt has an `Assistant` middleware that wires up the Slack assistant surface. We don't need its message handlers (we have our own) — we register it minimally so `assistant.threads.setStatus` is allowed for our app.

- [ ] **Step 1: Read the current app.ts**

```bash
cat bolt/src/app.ts
```

You'll see imports of `App, LogLevel`, the new App, `registerMessageHandlers(app)`, etc.

- [ ] **Step 2: Add Assistant registration**

Edit `bolt/src/app.ts`. Replace the file with:

```ts
// @ts-nocheck
/**
 * Kit Bolt App
 *
 * Persistent Slack bot using Socket Mode — no webhooks, no cold starts,
 * no 60-second timeout. Runs 24/7 on Railway.
 */

import 'dotenv/config'
import { App, Assistant, LogLevel } from '@slack/bolt'
import { registerMessageHandlers } from './handlers/messages'
import { registerCommandHandlers } from './handlers/commands'
import { registerInteractionHandlers } from './handlers/interactions'

// ─── Boot ──────────────────────────────────────────────────

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.INFO,
})

// ─── Register Assistant (for typing indicators) ────────────
// We don't use Bolt's assistant message-handler convention because our
// orchestrator is the message handler. But registering the Assistant
// middleware tells Slack our app supports `assistant.threads.setStatus`.

const assistant = new Assistant({
  threadStarted: async ({ event, say }) => {
    // Triggered when a user opens an Assistant thread with Kit. We could
    // greet here, but our orchestrator handles greetings via app_mention
    // and message events, so we no-op.
  },
  userMessage: async () => {
    // No-op: messages are handled by our app.event('message') handler.
  },
})

app.assistant(assistant)

// ─── Register Handlers ─────────────────────────────────────

registerMessageHandlers(app)
registerCommandHandlers(app)
registerInteractionHandlers(app)

// ─── Resilience ────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[Bolt] Unhandled rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[Bolt] Uncaught exception:', err)
})

// ─── Start ─────────────────────────────────────────────────

;(async () => {
  await app.start()
  console.log('⚡ Kit is online (Socket Mode)')
  console.log(`   Bot token: ...${process.env.SLACK_BOT_TOKEN?.slice(-6)}`)
  console.log(`   App token: ...${process.env.SLACK_APP_TOKEN?.slice(-6)}`)
  console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`)
})()
```

- [ ] **Step 3: Type-check**

```bash
cd bolt && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
cd bolt && npm test
```

Expected: all tests across memory, tools, specialist, orchestrator pass.

- [ ] **Step 5: Commit**

```bash
git add bolt/src/app.ts && git commit -m "Bolt: register Slack Assistant capability"
```

---

## Task 12: Slack App Configuration (Manual)

**Files:** none (Slack web admin)

This is browser-side work — Slack's app configuration must enable Assistant capability so `assistant.threads.setStatus` works.

- [ ] **Step 1: Open the Slack app config**

Navigate to https://api.slack.com/apps → select Kit's app.

- [ ] **Step 2: Enable Agents & AI Apps**

In the left nav: **Agents & AI Apps** → toggle ON. This unlocks the Assistant API surfaces.

- [ ] **Step 3: Add OAuth scope**

In the left nav: **OAuth & Permissions** → "Bot Token Scopes" → ensure `assistant:write` is present. Add it if not.

- [ ] **Step 4: Reinstall**

If you added a scope, click **Reinstall to Workspace** at the top. Copy the new bot token if it changes.

- [ ] **Step 5: Update Railway env if token changed**

If the bot token changed, update `SLACK_BOT_TOKEN` in Railway → Variables. (Skip if no scope change was needed.)

---

## Task 13: Add Anthropic Key to Railway

**Files:** none (Railway dashboard)

- [ ] **Step 1: Get an Anthropic API key**

If not already issued, create one at https://console.anthropic.com → Settings → API Keys → Create Key.

- [ ] **Step 2: Add to Railway**

Railway → Kit service → Variables → Add:
- `ANTHROPIC_API_KEY` = `sk-ant-...`

Save. Railway auto-redeploys.

- [ ] **Step 3: Verify deploy logs**

Watch the deploy logs. Look for:
```
⚡ Kit is online (Socket Mode)
   Anthropic key: set
```

If you see `Anthropic key: MISSING`, the variable didn't save. Re-check.

---

## Task 14: Smoke Test

**Files:** none (Slack workspace)

These tests validate end-to-end behavior in production. Run through them after Task 13's deploy is live.

- [ ] **Step 1: DM chitchat (no tool, fast path)**

Open a DM with Kit. Send: `morning kit`

Expected: Kit replies within ~2s with something warm and short, e.g. "Morning! How can I help?". No "thinking…" indicator (chat fast).

- [ ] **Step 2: Tool call**

Send: `whats the budget on [a real Harvest project name]`

Expected: "thinking…" indicator appears briefly. Within ~3-5s, Kit replies with budget figures. If the project doesn't exist, Kit replies with that fact warmly.

- [ ] **Step 3: Clarification follow-up**

Send: `find the latest cut for [an ambiguous query]`

Expected: Kit asks a clarification question ending with `?`.

Without re-@mentioning, send the disambiguating answer. Expected: Kit continues the conversation with the resolved request.

- [ ] **Step 4: @mention in a channel**

In a channel where Kit is invited (try `#general` or test channel), send: `@kit how are you doing today?`

Expected: Kit replies in the main channel (not threaded) with a warm short response.

- [ ] **Step 5: Frame.io link fast path**

Paste a Frame.io URL into a DM with Kit.

Expected: existing Frame.io handler runs (no orchestrator). Reply structure should match the previous (pre-orchestrator) Frame.io behavior.

- [ ] **Step 6: Time-entry fast path**

Send: `log 2 hours on [project] for editing`

Expected: existing time-entry handler runs (no orchestrator).

- [ ] **Step 7: Permissions denial (if you have a non-admin test user)**

Sign into Slack as an artist-tier user. Send: `whats the budget on [project]`

Expected: Kit replies with the access-denied reason warmly worded.

- [ ] **Step 8: TTL expiry**

Wait 16+ minutes since last message to Kit. Send a message that would otherwise look like a follow-up.

Expected: Kit treats it as a fresh conversation (no leftover clarification context).

If all eight pass, you're shipped. If any fail, capture Railway logs and the offending Slack message ts and triage.

---

## Self-Review Notes

- **Spec coverage:** Each spec section maps to tasks: voice → Task 6; architecture → Tasks 4, 8, 9; module layout → Tasks 2-9; data flow → Tasks 8, 9, 10; memory → Task 2; latency/cost (prompt caching) → Tasks 8, 9 (`cache_control: ephemeral`); error handling → Tasks 8, 9, 10; testing → unit tests in Tasks 2, 3, 8, 9 + smoke checklist in Task 14.
- **No placeholders:** every step has either complete code or a concrete command.
- **Type consistency:** `runOrchestrator` / `runSpecialist` / `OrchestratorRequest` / `OrchestratorResult` names are used consistently across Tasks 8, 9, 10. `loadConversation` / `appendUserTurn` / `appendAssistantTurn` / `hasPendingClarification` / `resetMemoryForTest` names match between Task 2 implementation and Tasks 9, 10 callers.
- **Cross-task ordering:** Task 8 imports `buildSpecialistTools` from Task 3 and `dispatch` + `enforceAccess` from existing code. Task 9 imports `runSpecialist` from Task 8, `loadConversation`/etc. from Task 2, `buildOrchestratorTools` from Task 3, `KIT_SYSTEM_PROMPT` from Task 6. Task 10 imports `runOrchestrator` from Task 9, `hasPendingClarification` from Task 2, status helpers from Task 5. No circular deps.
