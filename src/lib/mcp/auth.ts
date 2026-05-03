// @ts-nocheck
/**
 * MCP Auth
 *
 * Shared-secret authentication for the Kit MCP server.
 * Agents call the MCP with an Authorization: Bearer <KIT_MCP_SECRET> header
 * that we issue to them via Anthropic's vault_secret_id when we register
 * the agent. This way the secret never touches the agent's context — it's
 * injected at request time by Anthropic's Managed Agents infrastructure.
 */

export function checkMcpAuth(request: Request): { ok: true } | { ok: false; message: string } {
  const secret = process.env.KIT_MCP_SECRET
  if (!secret) {
    // In local dev we allow unauthenticated requests so testing is easy.
    // In production we require the secret to be set.
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'KIT_MCP_SECRET not configured on server' }
    }
    return { ok: true }
  }

  const auth = request.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) return { ok: false, message: 'Missing Authorization bearer token' }

  const provided = match[1].trim()
  if (provided !== secret) return { ok: false, message: 'Invalid MCP token' }

  return { ok: true }
}
