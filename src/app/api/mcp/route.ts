// @ts-nocheck
/**
 * Kit MCP HTTP endpoint.
 *
 * Agents (from Anthropic's Managed Agents API) POST MCP JSON-RPC 2.0
 * requests here with Authorization: Bearer <KIT_MCP_SECRET>.
 *
 * We implement streamable HTTP in stateless mode (single request/response
 * with JSON body) — no SSE, no sessions. This works cleanly on Vercel.
 */

import { NextResponse } from 'next/server'
import { handleRpc } from '@/lib/mcp/server'
import { checkMcpAuth } from '@/lib/mcp/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const auth = checkMcpAuth(request)
  if (!auth.ok) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: auth.message } },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    )
  }

  // Batch support per JSON-RPC 2.0
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((req) => handleRpc(req)))
    const filtered = results.filter((r) => r !== null)
    // If every call was a notification, respond with 204
    if (filtered.length === 0) return new NextResponse(null, { status: 204 })
    return NextResponse.json(filtered)
  }

  const response = await handleRpc(body)
  if (response === null) return new NextResponse(null, { status: 204 })
  return NextResponse.json(response)
}

// Some MCP clients probe with GET to check capabilities / transport
export async function GET() {
  return NextResponse.json({
    name: 'kit-mcp',
    version: '1.0.0',
    transport: 'streamable-http-stateless',
    method: 'POST',
    auth: 'bearer',
  })
}
