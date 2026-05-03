// @ts-nocheck
/**
 * Kit MCP endpoint with path-based auth.
 *
 * Anthropic's Managed Agents API doesn't accept arbitrary auth headers on
 * MCP server configs — so we embed the KIT_MCP_SECRET in the URL path.
 *
 * Incoming URL:  /api/mcp/<secret>
 * We compare the path segment to process.env.KIT_MCP_SECRET before dispatching.
 */

import { NextResponse } from 'next/server'
import { handleRpc } from '@/lib/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function checkKey(key: string): boolean {
  const expected = process.env.KIT_MCP_SECRET
  if (!expected) return false
  return key === expected
}

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params
  if (!checkKey(key)) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Invalid MCP key' } },
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

  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((req) => handleRpc(req)))
    const filtered = results.filter((r) => r !== null)
    if (filtered.length === 0) return new NextResponse(null, { status: 204 })
    return NextResponse.json(filtered)
  }

  const response = await handleRpc(body)
  if (response === null) return new NextResponse(null, { status: 204 })
  return NextResponse.json(response)
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params
  if (!checkKey(key)) {
    return NextResponse.json({ error: 'Invalid MCP key' }, { status: 401 })
  }
  return NextResponse.json({
    name: 'kit-mcp',
    version: '1.0.0',
    transport: 'streamable-http-stateless',
    method: 'POST',
  })
}
