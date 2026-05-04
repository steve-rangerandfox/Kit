# Kit Conversational Layer — Design

**Date:** 2026-05-04
**Status:** Approved (architecture); pending implementation plan
**Replaces:** Regex intent resolver in `bolt/src/handlers/messages.ts`

## Goal

Replace Kit's current keyword-regex intent resolver with a Claude-powered conversational layer so Kit can:

1. Hold warm, natural-language conversation (greetings, follow-ups, chitchat) — **C, top priority**
2. Route arbitrary requests to the right specialist agent via tool use — **A**
3. Ask clarifying follow-up questions when a request is ambiguous — **B**
4. Compose multi-agent responses (deferred to v2) — **D, out of scope**

Kit is internal-only (admin / producer / artist tiers). No client-facing surface.

## Non-Goals

- Multi-tool composition in a single turn (parallel agent calls, chained reasoning) — explicitly deferred.
- Streaming responses to Slack — not worth the `chat.update` complexity in v1.
- Persistent conversation history across Railway redeploys — in-memory only is fine for v1.
- Replacing the existing Frame.io link / time-entry fast-paths in `messages.ts` — those stay direct.

## Constraints

- **Latency target:** chitchat ≤ 1.5s, single-tool turn ≤ 4s. Multi-LLM-hop architecture costs latency; mitigations described below.
- **Access control:** must respect existing `checkGateway` + `filterResultData` boundary in `src/lib/inngest/access-control.ts`. Enforced at specialist level via `enforceAccess()`.
- **Prompt caching:** required. Both orchestrator and each specialist system prompt must be cached.
- **Conversation memory:** scoped per `(teamId, channel, userId)` with 15-minute sliding TTL.
- **Reply location:** main channel flow, never threaded — applies to both DMs and channel @mentions.

## Voice

Kit's tone: **warm + understated**. Concrete examples define the bar:

- "Morning! How can I help?"
- "Got it — logging 2 hrs to Acme Spot. Want me to add notes?"
- "I checked — no new comments on the hero cut yet."

The `bolt/src/llm/prompts/kit-system.ts` artifact carries this voice with concrete few-shot examples. It is the single source of truth for Kit's personality and gets refined as we observe real conversations.

## Architecture

```
Slack message
   │
   ▼
Bolt handler (bolt/src/handlers/messages.ts)
   │  load conversation state for (teamId, channel, userId)
   │  post assistant.threads.setStatus("thinking…")
   ▼
┌──────────────────────────────────────────────────┐
│  Kit Orchestrator   (bolt/src/llm/orchestrator)  │
│  Model: claude-sonnet-4-7                        │
│  System prompt: Kit's personality + capabilities │
│  Tools: ask_harvest, ask_dropbox, ask_frameio,   │
│         ask_slack  (one per registered agent)    │
└─────────┬────────────────────────────────────────┘
          │ tool_use: ask_harvest("budget on Acme Spot")
          ▼
┌──────────────────────────────────────────────────┐
│  Specialist Sub-Agent (bolt/src/llm/specialists) │
│  Model: claude-haiku-4-5-20251001                │
│  System prompt: domain-specific (Harvest)        │
│  Tools: harvest_log_time, harvest_get_budget…    │
│  (generated from registry capabilities)          │
└─────────┬────────────────────────────────────────┘
          │ tool_use: harvest_get_budget({project: "Acme Spot"})
          ▼
   registry.dispatch("harvest", "get_budget", {...})
   → enforceAccess() → checkGateway + filterResultData
   → AgentResult returned to specialist
   → specialist composes structured summary
   → returned to orchestrator as tool_result
   → orchestrator composes warm reply
   ▼
Slack chat.postMessage (main flow)
```

**Two LLM hops per tool turn**, mitigated by:

- **Single-shot bypass.** Orchestrator can answer chitchat / clarifications / "thanks" without invoking any tool. Common case is one hop, ~1.2s.
- **Haiku for specialists.** Sub-agents only need to pick a tool from a small list and summarize the result. No personality work needed. Faster + cheaper.
- **Prompt caching on both system prompts.** First call in a 5-minute window pays full cost; subsequent calls amortize. With sustained workspace traffic the cache is always warm.

Expected latency:
- Chitchat (no tools): ~1.2s
- Single tool call: ~3s
- Clarification follow-up: ~1.5s

## Module Layout

```
bolt/src/llm/
├── client.ts              # Anthropic SDK singleton
├── orchestrator.ts        # Kit's main brain — system prompt, tools, run loop
├── specialist.ts          # Generic specialist factory (one factory, many specialists)
├── prompts/
│   ├── kit-system.ts      # Kit's personality (warm + understated)
│   ├── harvest-system.ts
│   ├── dropbox-system.ts
│   ├── frameio-system.ts
│   └── slack-system.ts
├── tools.ts               # Generates Claude tool defs from registry capabilities
├── memory.ts              # In-memory conversation store (Map + TTL)
└── status.ts              # assistant.threads.setStatus wrapper
```

Modified files:
- `bolt/src/handlers/messages.ts` — replace `resolveIntent` + `handleAgentRequest` with `orchestrator.run()`.
- `bolt/src/app.ts` — register Slack assistant capability (so `assistant.threads.setStatus` works).

The `specialist.ts` factory is critical: `createSpecialist(agentId)` reads capabilities from the existing registry and generates a sub-agent run loop. **Adding a new agent = register it in `src/lib/inngest/agents/registry.ts` plus write a one-page `prompts/<name>-system.ts`.** No new sub-agent code per agent.

`tools.ts` produces two tool surfaces from `getCapabilitiesManifest()`:
- Orchestrator-level: `ask_harvest`, `ask_dropbox`, ... (one per registered agent)
- Specialist-level: per-agent action tools (`harvest_log_time`, `harvest_get_budget`, ...)

## Data Flow — Concrete Example

User in `#proj-acme`: *"what's the budget on the Acme spot?"*

1. Slack `app_mention` event → `handleMessage()` in `bolt/src/handlers/messages.ts`.
2. Resolve workspace + user context (existing `resolveWorkspaceId` + `resolveUserContext`).
3. Load conversation state for key `${teamId}:${channel}:${userId}`. State exists, last activity 2 min ago. Append user message to history.
4. POST `assistant.threads.setStatus("thinking…")`.
5. `orchestrator.run({ user, history, message })`:
   - Anthropic call: Sonnet 4.7, system prompt (cached), tools = `[ask_harvest, ask_dropbox, ask_frameio, ask_slack]`, messages = history + new user turn.
   - Claude returns `tool_use: ask_harvest({query: "budget on Acme spot project"})`.
6. `specialist.run("harvest", subQuery, user)`:
   - Anthropic call: Haiku 4.5, harvest system prompt (cached), tools = harvest action tool defs, messages = `[{role: user, content: subQuery}]`.
   - Claude returns `tool_use: harvest_get_budget({project: "Acme Spot"})`.
7. Specialist invokes `enforceAccess(user, "harvest", "get_budget", payload, () => registry.dispatch(...))`. Gateway passes (user is producer with financial access). `dispatch` returns `{success: true, data: {budget_total: 50000, budget_spent: 31200, ...}}`. Field-level filter applied (no admin-only fields stripped for producer).
8. Specialist returns tool_result to its own Claude call. Haiku composes a brief structured summary: `"Acme Spot budget: $50,000 total, $31,200 spent (62%), $18,800 remaining."`
9. Specialist returns that string to orchestrator as the result of `ask_harvest`.
10. Orchestrator continues its Claude call with the tool_result. Sonnet composes the warm-voiced reply: `"Acme Spot is at 62% — $31.2k spent of $50k, $18.8k left. Want me to break it down by phase?"`
11. Append both turns to conversation state. Heuristic: response ends with `?` → set `awaitingClarification = true`.
12. POST to Slack `chat.postMessage` (main flow, no `thread_ts`).
13. `assistant.threads.setStatus("")` to clear typing indicator.

If the user replies *"yes"* within 15 minutes:
- State found, `awaitingClarification = true`, message arrives without @mention but matches the awaiting-state.
- Bolt routes the message to Kit (new event subscription path: see "Triggers").
- Orchestrator runs with full history; Claude understands context.

## Memory Model

```ts
interface ConversationState {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    ts: number  // unix ms
  }>
  awaitingClarification: boolean
  lastTurnAt: number
  createdAt: number
}

const MEMORY_TTL_MS = 15 * 60 * 1000   // 15 min sliding window
const MAX_MESSAGES_PER_CONVO = 20      // truncate oldest beyond this
const conversations = new Map<string, ConversationState>()
// key: `${teamId}:${channel}:${userId}`
```

**Cleanup policy:** lazy. On every memory access, check TTL of the touched key. Optional periodic sweep every 5 minutes (cheap) to free memory for stale conversations.

**State transitions:**
- User message arrives → if state exists and not expired, append; else create fresh.
- Kit response sent → append assistant turn. Set `awaitingClarification = (response ends with '?')` as v1 heuristic.
- TTL expired → next message starts fresh state. (No "good morning" loop because Kit doesn't remember greeting them.)

**Triggers — when does Kit listen?**
- DM message (any) — always.
- @mention in any channel where Kit is invited.
- **NEW**: channel message *without* @mention but matching an active `(channel, user)` state with `awaitingClarification: true` and within TTL. This enables clarification follow-ups.

The third trigger requires Kit's event subscription to include `message.channels` (already enabled — used for time-entry detection in current handler). The handler logic is the new part: filter to "from a user with pending clarification" before invoking the orchestrator, otherwise drop silently.

## Latency & Cost

**Models:**
- Orchestrator: `claude-sonnet-4-7` (good reasoning, voice quality)
- Specialists: `claude-haiku-4-5-20251001` (fast tool selection, structured summary)

**Prompt caching:** required on both system prompts. 5-minute TTL covers typical conversational gap. Cache key includes the static portion of the system prompt + tool definitions.

**Per-turn token estimates:**
- Chitchat (Sonnet only, no tool): ~500 input + ~150 output = ~$0.003
- Tool turn (Sonnet → Haiku → Sonnet): ~$0.008
- Cached system prompts: ~$0.0003 per cache read after first call

**Monthly cost estimate** (small team, ~20 conversational turns/day, ~50% involve tools): **$5–15/month** in Anthropic API costs. Negligible.

**No streaming in v1.** Slack `chat.postMessage` is single-shot; streaming would require `chat.update` calls per chunk, which is messy and provides little value when total response is ≤4s.

## Error Handling

Failures, ranked by likelihood:

| Failure | Behavior |
|---|---|
| Anthropic API timeout (>30s) | Reply: *"I'm having trouble thinking clearly — try again in a sec?"* Log error. |
| Specialist returns error | Orchestrator receives error in tool_result, composes warm wrapper: *"I tried to check Harvest but it didn't go through — [reason]."* |
| Agent dispatch fails (Harvest down, etc.) | `registry.dispatch` returns `{success: false, error}`. Specialist passes through. Orchestrator wraps. |
| Access denied (`checkGateway`) | `enforceAccess` returns gateway denial reason. Specialist returns reason verbatim. Orchestrator delivers it lightly. |
| Process-level crash (uncaught rejection) | Already caught by `process.on('unhandledRejection', …)` added in `bolt/src/app.ts` (commit `119afce`). Log and continue. |
| Slack post fails | Bolt's built-in retry handles transient errors. |

**No fallback to regex.** The keyword resolver was a stopgap. If Claude is unavailable, Kit posts a friendly error rather than silently degrading to dumb pattern matching.

## Testing

**Unit:**
- `tools.ts` — given a fixture manifest, generates correct Claude tool definitions.
- `memory.ts` — TTL eviction, `awaitingClarification` state transitions, max-message truncation.
- `prompts/*` — snapshot tests on assembled system prompts (catch regressions in voice).

**Integration:**
- Mock Anthropic SDK. Verify orchestrator → specialist → registry flow for a representative request (e.g., budget query).
- Use real `registry.dispatch` with mocked agent handlers (so registry + access-control logic are exercised).

**Manual smoke tests** after deploy (primary validation, run from a Slack workspace):
1. *"Hi Kit"* in DM → friendly greeting (no tool).
2. *"What's the budget on [real project]?"* in channel → tool call, warm reply.
3. *"Find the latest cut for [project]"* → routes to dropbox specialist.
4. *"Log 2 hours on [project] for testing"* → write action, confirms before/after.
5. Ambiguous reference (e.g., *"the Acme one"* with two Acme projects) → clarification follow-up.
6. Artist user asks *"budget on [project]"* → access-denied response, warmly worded.
7. Mid-conversation: Kit asks clarification, user replies without @mention → continuation works.
8. After 20-min gap, user sends new message → fresh conversation, no stale context.

## Open Questions / Future Work

1. **Parallel tool calls.** *"Summarize all my active projects"* would benefit from calling multiple specialists in parallel. Deferred to v2 (the **D** priority).
2. **Persistent conversation memory.** Survives Railway redeploys via Supabase. Add only if user feedback shows redeploys are disruptive.
3. **Tool-result caching.** If user asks about the same project twice in 5 min, second query could hit a result cache. Premature without usage data.
4. **Streaming.** Revisit if response times exceed 5s in practice.
5. **Specialist personality.** v1 specialists are clinical (just route + summarize). May want to give Harvest specialist more voice once we see real exchanges.
