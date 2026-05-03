/**
 * Shared environment configurations for Kit's Managed Agents.
 * 
 * Kit uses a single cloud environment with unrestricted networking
 * so agents can access Supabase, Slack, Clockify, etc. via MCP servers.
 */

export const KIT_ENVIRONMENT = {
  name: 'kit-production',
  config: {
    type: 'cloud' as const,
    networking: { type: 'unrestricted' as const },
  },
}

/**
 * MCP server configs that agents can reference.
 * These give agents access to Kit's data and integrations
 * without passing credentials into the agent sandbox.
 */
export const MCP_SERVERS = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    name: 'kit-supabase',
  },
  slack: {
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/slack`,
    name: 'kit-slack',
  },
  clockify: {
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/clockify`,
    name: 'kit-clockify',
  },
}
