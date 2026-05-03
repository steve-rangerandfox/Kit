/**
 * Managed Agents API Client
 * 
 * Wraps Anthropic's Managed Agents REST API for creating agents,
 * environments, sessions, and streaming events.
 * 
 * Docs: https://platform.claude.com/docs/en/managed-agents/overview
 */

const API_BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'
const BETA_HEADER = 'managed-agents-2026-04-01'

// ─── Types ───────────────────────────────────────────────────

export interface AgentConfig {
  name: string
  model: string
  system: string
  tools?: AgentTool[]
  mcp_servers?: McpServerConfig[]
}

export interface AgentTool {
  type: string
  [key: string]: unknown
}

export interface McpServerConfig {
  type: 'url'
  url: string
  name: string
  /** Static bearer token sent to the MCP server as `Authorization: Bearer <token>` */
  authorization_token?: string
  /** Alternative: reference a secret stored in Anthropic's vault */
  credentials?: { vault_secret_id: string }
}

export interface AgentResponse {
  id: string
  version: string
  name: string
  model: string
}

export interface EnvironmentConfig {
  name: string
  config: {
    type: 'cloud'
    networking?: { type: 'unrestricted' | 'restricted' }
  }
}

export interface EnvironmentResponse {
  id: string
  name: string
}

export interface SessionConfig {
  agent: string
  environment_id: string
  title?: string
  metadata?: Record<string, string>
}

export interface SessionResponse {
  id: string
  status: string
  agent: string
  environment_id: string
}

export interface UserMessageEvent {
  type: 'user.message'
  content: Array<{ type: 'text'; text: string }>
}

export interface AgentEvent {
  type: string
  [key: string]: unknown
}

// ─── Client ──────────────────────────────────────────────────

export class ManagedAgentsClient {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || ''
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      // Re-check env var at call time (may not be available at import time during build)
      this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    }
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Managed Agents')
    }
  }

  private headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': BETA_HEADER,
      'content-type': 'application/json',
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.ensureApiKey()
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const errorBody = await res.text()
      throw new ManagedAgentsError(
        `API error ${res.status}: ${errorBody}`,
        res.status,
        errorBody
      )
    }

    return res.json() as Promise<T>
  }

  // ─── Agents ──────────────────────────────────────────────

  async createAgent(config: AgentConfig): Promise<AgentResponse> {
    return this.request<AgentResponse>('POST', '/agents', config)
  }

  async getAgent(agentId: string): Promise<AgentResponse> {
    return this.request<AgentResponse>('GET', `/agents/${agentId}`)
  }

  async listAgents(): Promise<{ data: AgentResponse[] }> {
    return this.request<{ data: AgentResponse[] }>('GET', '/agents')
  }

  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<AgentResponse> {
    return this.request<AgentResponse>('PATCH', `/agents/${agentId}`, config)
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request<void>('DELETE', `/agents/${agentId}`)
  }

  // ─── Environments ────────────────────────────────────────

  async createEnvironment(config: EnvironmentConfig): Promise<EnvironmentResponse> {
    return this.request<EnvironmentResponse>('POST', '/environments', config)
  }

  async getEnvironment(envId: string): Promise<EnvironmentResponse> {
    return this.request<EnvironmentResponse>('GET', `/environments/${envId}`)
  }

  async listEnvironments(): Promise<{ data: EnvironmentResponse[] }> {
    return this.request<{ data: EnvironmentResponse[] }>('GET', '/environments')
  }

  // ─── Sessions ────────────────────────────────────────────

  async createSession(config: SessionConfig): Promise<SessionResponse> {
    return this.request<SessionResponse>('POST', '/sessions', config)
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('GET', `/sessions/${sessionId}`)
  }

  async listSessions(agentId?: string): Promise<{ data: SessionResponse[] }> {
    const query = agentId ? `?agent=${agentId}` : ''
    return this.request<{ data: SessionResponse[] }>('GET', `/sessions${query}`)
  }

  // ─── Events ──────────────────────────────────────────────

  async sendEvent(sessionId: string, events: UserMessageEvent[]): Promise<void> {
    await this.request<void>('POST', `/sessions/${sessionId}/events`, { events })
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    await this.sendEvent(sessionId, [
      {
        type: 'user.message',
        content: [{ type: 'text', text }],
      },
    ])
  }

  /**
   * Fast-poll events from a session until the agent's turn completes.
   * Starts at 400ms intervals, backs off to 1s after 10 polls.
   */
  async streamUntilDone(
    sessionId: string,
    opts: { timeoutMs?: number } = {}
  ): Promise<AgentEvent[]> {
    const timeoutMs = opts.timeoutMs ?? 55_000
    const seen = new Set<string>()
    const collected: AgentEvent[] = []
    const startedAt = Date.now()
    let polls = 0

    while (Date.now() - startedAt < timeoutMs) {
      let events: AgentEvent[] = []
      try {
        const res = await this.listEvents(sessionId, { limit: 100, order: 'asc' })
        events = res.data || []
      } catch {
        await sleep(500)
        continue
      }

      for (const evt of events) {
        const id = (evt as any).id || `${(evt as any).type}-${(evt as any).created_at || ''}`
        if (!seen.has(id)) {
          seen.add(id)
          collected.push(evt)
        }
      }

      // Check for terminal events
      for (const evt of collected) {
        const t = (evt as any).type
        if (
          t === 'session.status_idle' ||
          t === 'agent.turn_complete' ||
          t === 'session.completed'
        ) {
          return collected
        }
      }

      polls++
      await sleep(polls < 10 ? 400 : 1000)
    }

    return collected
  }

  /**
   * List events from a session (paginated).
   */
  async listEvents(
    sessionId: string,
    opts: { limit?: number; order?: 'asc' | 'desc'; page?: number } = {}
  ): Promise<{ data: AgentEvent[]; has_more?: boolean; next_page?: string | number }> {
    const params = new URLSearchParams()
    params.set('limit', String(opts.limit ?? 100))
    params.set('order', opts.order ?? 'asc')
    if (opts.page !== undefined) params.set('page', String(opts.page))
    return this.request<{ data: AgentEvent[]; has_more?: boolean; next_page?: string | number }>(
      'GET',
      `/sessions/${sessionId}/events?${params.toString()}`
    )
  }

  /**
   * Poll a session's events until the agent's turn completes.
   * Returns all new events produced during the turn.
   *
   * Stops when:
   *   - Session status becomes idle/completed/ended
   *   - A terminal event type is observed (agent.turn_complete / session.idle)
   *   - Timeout is reached
   */
  async pollUntilDone(
    sessionId: string,
    opts: {
      sinceEventIds?: Set<string>
      timeoutMs?: number
      pollIntervalMs?: number
    } = {}
  ): Promise<AgentEvent[]> {
    const timeoutMs = opts.timeoutMs ?? 55_000
    const pollIntervalMs = opts.pollIntervalMs ?? 1500
    const seen = new Set<string>(opts.sinceEventIds ?? [])
    const collected: AgentEvent[] = []
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      // Fetch latest events (newest first is more efficient for polling)
      let events: AgentEvent[] = []
      try {
        const res = await this.listEvents(sessionId, { limit: 100, order: 'asc' })
        events = res.data || []
      } catch (err) {
        // On transient errors, wait and retry
        await sleep(pollIntervalMs)
        continue
      }

      // Add new events we haven't seen
      let sawNew = false
      for (const evt of events) {
        const id = (evt as any).id || `${(evt as any).type}-${(evt as any).created_at || ''}`
        if (!seen.has(id)) {
          seen.add(id)
          collected.push(evt)
          sawNew = true
        }
      }

      // Check for terminal conditions
      if (this.isTurnComplete(collected)) {
        return collected
      }

      // If we've got nothing new for a while and session is idle, stop
      if (!sawNew) {
        try {
          const session = await this.getSession(sessionId)
          const status = (session as any).status
          if (status && ['idle', 'completed', 'ended', 'waiting', 'succeeded'].includes(status)) {
            return collected
          }
        } catch {
          // ignore — keep polling
        }
      }

      await sleep(pollIntervalMs)
    }

    return collected
  }

  private isTurnComplete(events: AgentEvent[]): boolean {
    // Look for terminal event types in what we've collected so far
    for (const evt of events) {
      const t = (evt as any).type
      if (!t) continue
      if (
        t === 'agent.turn_complete' ||
        t === 'turn.completed' ||
        t === 'session.idle' ||
        t === 'session.status_idle' ||
        t === 'session.completed' ||
        t === 'message.stop' ||
        t === 'agent.stop'
      ) {
        return true
      }
    }
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Error ───────────────────────────────────────────────────

export class ManagedAgentsError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'ManagedAgentsError'
    this.status = status
    this.body = body
  }
}

// ─── Singleton ───────────────────────────────────────────────

let _client: ManagedAgentsClient | null = null

export function getManagedAgentsClient(): ManagedAgentsClient {
  if (!_client) {
    _client = new ManagedAgentsClient()
  }
  return _client
}
