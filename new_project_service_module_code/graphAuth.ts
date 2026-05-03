// src/services/graphAuth.ts

import axios from 'axios';
import { logger } from '../utils/logger';

interface TokenCache {
  token: string;
  expiresAt: number; // unix ms
}

let cache: TokenCache | null = null;

/**
 * Acquires an app-only Microsoft Graph token using the client credentials flow.
 * Tokens are cached until 5 minutes before expiry.
 */
export async function getGraphToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.token;
  }

  const tenantId = process.env.AZURE_TENANT_ID ?? '';
  const clientId = process.env.AZURE_CLIENT_ID ?? '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET ?? '';

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, expires_in } = response.data as {
    access_token: string;
    expires_in: number;
  };

  cache = {
    token: access_token,
    expiresAt: now + (expires_in - 300) * 1000, // subtract 5 min buffer
  };

  logger.debug('Graph token acquired', { expiresIn: expires_in });
  return access_token;
}

/** Clears the token cache — useful in tests */
export function clearGraphTokenCache(): void {
  cache = null;
}
