interface TokenCache {
  token: string
  expiresAt: number
}

let cache: TokenCache | null = null

/**
 * Acquires an app-only Microsoft Graph token via client credentials flow.
 * Cached until 5 minutes before expiry.
 */
export async function getGraphToken(): Promise<string> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.token

  const tenantId = process.env.AZURE_TENANT_ID ?? ''
  const clientId = process.env.AZURE_CLIENT_ID ?? ''
  const clientSecret = process.env.AZURE_CLIENT_SECRET ?? ''

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  )

  if (!res.ok) {
    throw new Error(`Graph auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }

  cache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 300) * 1000,
  }

  return data.access_token
}
