import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies a Slack request signature per
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!timestamp || !signature) return false

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false

  const sigBase = `v0:${timestamp}:${body}`
  const hmac = createHmac('sha256', secret)
  hmac.update(sigBase)
  const computed = `v0=${hmac.digest('hex')}`

  try {
    const a = Buffer.from(computed)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
