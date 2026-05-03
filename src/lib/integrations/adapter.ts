/**
 * Base interfaces for integration adapters
 * Defines standard contract for all external service integrations
 */

/**
 * Base interface that all integrations must implement
 */
export interface IntegrationAdapter {
  /**
   * Name of the integration service
   */
  name: string

  /**
   * Tests the connection to the external service
   * @param config Integration configuration (API keys, credentials, etc.)
   * @returns Promise resolving to connection test result
   */
  testConnection(config: Record<string, unknown>): Promise<{
    success: boolean
    error?: string
  }>

  /**
   * Syncs data from the external service to Kit
   * @param workspaceId ID of the workspace to sync into
   * @param config Integration configuration
   * @returns Promise resolving to sync result with count and errors
   */
  sync(
    workspaceId: string,
    config: Record<string, unknown>
  ): Promise<{
    synced: number
    errors: string[]
  }>
}

/**
 * Extended interface for OAuth-based integrations
 * Adds authentication flow methods
 */
export interface OAuthAdapter extends IntegrationAdapter {
  /**
   * Gets the OAuth authorization URL for the user to visit
   * @param workspaceId ID of the workspace to authorize for
   * @returns OAuth authorization URL
   */
  getAuthUrl(workspaceId: string): string

  /**
   * Handles OAuth callback after user authorization
   * Exchanges authorization code for tokens
   * @param code Authorization code from OAuth provider
   * @param workspaceId ID of the workspace
   * @returns Promise resolving to access token and optional refresh token
   */
  handleCallback(
    code: string,
    workspaceId: string
  ): Promise<{
    accessToken: string
    refreshToken?: string
  }>
}

/**
 * Configuration for integration adapters
 */
export interface AdapterConfig {
  /**
   * OAuth credentials
   */
  oauth?: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }

  /**
   * API key or token
   */
  apiKey?: string

  /**
   * Custom headers or authentication parameters
   */
  headers?: Record<string, string>

  /**
   * Custom parameters for the service
   */
  params?: Record<string, unknown>
}
