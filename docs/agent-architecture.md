# Kit Agent Architecture

## Overview

Kit is a **chief-of-staff orchestrator** that dispatches work to purpose-built internal agents. Each agent owns a single external service domain (Harvest, Dropbox, Frame.io, Slack, etc.) and runs as a durable Inngest step function with independent error handling, retries, and timeouts.

## Why This Architecture

The previous approach ran all provisioning inline inside a single Vercel serverless function. This caused:

- **60-second timeout ceiling** — sequential API calls to 6+ services regularly hit Vercel's limit
- **Coupled failure domains** — one slow/broken API hung the entire pipeline
- **No retries** — a transient Dropbox 429 killed the whole project creation
- **No visibility** — impossible to tell which service failed or was slow

The agent architecture solves all four:

- Each agent is an **Inngest step** with its own timeout and retry policy
- Agents run **in parallel** via Inngest's fan-out pattern
- Failed agents **retry independently** without affecting others
- Inngest dashboard provides **full observability** per-step

## Architecture Diagram

```
Slack @Kit / MCP tool call
        │
        ▼
┌─────────────────────┐
│   Kit Orchestrator   │  ← MCP tool handler or Slack event
│   (kit_create_project)│
│                     │
│  1. Create project  │  ← Supabase insert (fast, <1s)
│     record in DB    │
│  2. Send Inngest    │  ← inngest.send("kit/project.provision")
│     event           │
│  3. Return to user  │  ← "Project created! Provisioning..."
│     immediately     │
└─────────────────────┘
        │
        ▼  (async, event-driven)
┌─────────────────────────────────────────────────┐
│              Inngest: provision-project          │
│                                                 │
│  step.run("harvest")  ──→  Harvest Agent        │
│  step.run("dropbox")  ──→  Dropbox Agent        │
│  step.run("frameio")  ──→  Frame.io Agent       │
│  step.run("canva")    ──→  Canva Agent          │
│  step.run("clockify") ──→  Clockify Agent       │
│  step.run("slack")    ──→  Slack Agent          │
│         │                                       │
│         ▼  (all settled)                        │
│  step.run("stitch")   ──→  Patch Supabase       │
│  step.run("notify")   ──→  Post results to Slack│
└─────────────────────────────────────────────────┘
```

## Event Schema

```typescript
// Trigger event
"kit/project.provision" {
  data: {
    projectId: string        // Supabase project UUID
    workspaceId: string
    projectName: string
    client: string
    projectCode?: string
    projectType?: string
    startDate?: string
    targetDelivery?: string
    briefSummary?: string
    budgetTotal?: number
    services: ServiceKey[]   // which agents to activate
    slackUserId?: string     // who triggered it
    slackChannelId?: string  // where to post updates
  }
}

// Completion event (optional, for chaining)
"kit/project.provisioned" {
  data: {
    projectId: string
    results: Record<ServiceKey, AgentResult>
  }
}
```

## Agent Contract

Every agent implements the same shape:

```typescript
interface AgentResult {
  service: string       // human-readable name
  success: boolean
  url?: string          // link to the created resource
  id?: string           // external service ID
  error?: string        // failure reason
  meta?: Record<string, unknown>  // service-specific extras
}
```

Agents receive the full provision event data and return an `AgentResult`. They are responsible for:

- Checking their own env vars / auth
- Creating the resource
- Returning a URL and ID on success
- Catching errors and returning `{ success: false, error }` — never throwing

## Retry Policy

Each agent step uses Inngest's built-in retry:

```typescript
step.run("harvest", { retries: 2 }, async () => { ... })
```

- **2 retries** per agent (3 total attempts)
- **Exponential backoff** handled by Inngest
- Individual step timeout: **30 seconds**
- Total function timeout: **5 minutes** (plenty of headroom)

## File Structure

```
src/lib/inngest/
├── client.ts              # Inngest client + event type definitions
├── events.ts              # Event schemas (Zod)
├── orchestrator.ts        # Fan-out/fan-in provision function
└── agents/
    ├── harvest.ts         # Harvest: client + project + tasks
    ├── dropbox.ts         # Dropbox: clone template folder
    ├── frameio.ts         # Frame.io: create project + folders
    ├── slack.ts           # Slack: channel + canvas + link post
    ├── canva.ts           # Canva: create project
    ├── clockify.ts        # Clockify: create project + tasks
    └── types.ts           # Shared AgentResult type

src/app/api/inngest/
└── route.ts               # Inngest serve() endpoint
```

## Migration Path

1. **Phase 1** (this PR): Set up Inngest, build orchestrator + Harvest/Dropbox/Frame.io/Slack agents. The MCP `kit_create_project` handler changes from inline provisioning to `inngest.send()`.

2. **Phase 2**: Migrate the original `src/lib/provisioner/` services (Canva, OneDrive, Clockify, FigJam) into Inngest agents. Remove the old orchestrator.

3. **Phase 3**: Add streaming status updates to Slack via agent progress events. Kit posts a status message and updates it as each agent reports in.

## Adding a New Agent

1. Create `src/lib/inngest/agents/{service}.ts`
2. Export a function matching `(data: ProvisionEventData) => Promise<AgentResult>`
3. Add the service key to `ServiceKey` type and `events.ts`
4. Add a `step.run("{service}", ...)` call in `orchestrator.ts`
5. Add the service to the stitch step's link-patching logic

Each agent is ~30-60 lines. The orchestrator doesn't need to know anything about the service's API — it just calls the agent function and collects the result.
