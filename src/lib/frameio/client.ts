// @ts-nocheck
/**
 * Frame.io v2 API Client
 *
 * Handles auth, review-link resolution, comment fetching, and
 * thumbnail/frame retrieval for the notes-extraction pipeline.
 */

const BASE_URL = 'https://api.frame.io/v2'

function headers() {
  const token = process.env.FRAMEIO_TOKEN
  if (!token) throw new Error('FRAMEIO_TOKEN not configured')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function frameioGet(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Frame.io ${path}: ${res.status} ${body}`)
  }
  return res.json()
}

// ─── Types ──────────────────────────────────────────────────

export interface FrameIoComment {
  id: string
  text: string
  timestamp: number | null    // seconds into video (null = general comment)
  ownerName: string
  ownerEmail: string
  createdAt: string
  completed: boolean
}

export interface FrameIoAsset {
  id: string
  name: string
  type: string
  duration: number | null     // seconds
  thumbUrl: string | null
  proxyUrl: string | null
  originalUrl: string | null
  hlsUrl: string | null
}

// ─── Review Link Resolution ─────────────────────────────────

/**
 * Extract the review link ID from a Frame.io URL.
 * Supports formats:
 *   https://app.frame.io/reviews/{id}
 *   https://app.frame.io/reviews/{id}/...
 *   https://app.frame.io/reviews/{id}?version=...
 */
export function parseReviewUrl(url: string): string | null {
  const match = url.match(/frame\.io\/reviews\/([a-f0-9-]+)/i)
  return match ? match[1] : null
}

/**
 * Extract an asset ID directly from a Frame.io asset URL.
 *   https://app.frame.io/player/{asset_id}
 */
export function parseAssetUrl(url: string): string | null {
  const match = url.match(/frame\.io\/player\/([a-f0-9-]+)/i)
  return match ? match[1] : null
}

/**
 * Resolve a review link to its assets.
 * GET /v2/review_links/{id}/items
 */
export async function getReviewLinkAssets(reviewLinkId: string): Promise<FrameIoAsset[]> {
  const data = await frameioGet(`/review_links/${reviewLinkId}/items`)
  const items = Array.isArray(data) ? data : (data.assets || data.items || [])
  return items.map(normalizeAsset)
}

/**
 * Get a single asset by ID.
 * GET /v2/assets/{id}
 */
export async function getAsset(assetId: string): Promise<FrameIoAsset> {
  const data = await frameioGet(`/assets/${assetId}`)
  return normalizeAsset(data)
}

// ─── Comments ───────────────────────────────────────────────

/**
 * Fetch all comments for an asset.
 * GET /v2/assets/{asset_id}/comments
 */
export async function getAssetComments(assetId: string): Promise<FrameIoComment[]> {
  const data = await frameioGet(`/assets/${assetId}/comments`)
  const items = Array.isArray(data) ? data : (data.comments || data.items || [])

  return items.map((c: any) => ({
    id: c.id,
    text: c.text || '',
    timestamp: typeof c.timestamp === 'number' ? c.timestamp : null,
    ownerName: c.owner?.name || c.owner_name || 'Unknown',
    ownerEmail: c.owner?.email || c.owner_email || '',
    createdAt: c.inserted_at || c.created_at || '',
    completed: c.completed || false,
  }))
}

// ─── Thumbnail / Frame Extraction ───────────────────────────

/**
 * Get a thumbnail URL for a specific timecode.
 *
 * Strategy:
 * 1. If the asset has a thumb_urls array (proxy storyboard), find closest
 * 2. Fall back to proxy URL + seek (caller handles frame extraction)
 * 3. Fall back to asset thumbnail (poster frame)
 */
export async function getFrameAtTimecode(
  assetId: string,
  timecodeSeconds: number
): Promise<{ url: string; source: 'frame' | 'thumb' | 'poster' } | null> {
  try {
    // Try to get the asset details which may include thumb/proxy info
    const asset = await getAsset(assetId)

    // Frame.io assets often have a thumb endpoint
    // Try: /assets/{id}/thumb?time={seconds}
    try {
      const thumbRes = await fetch(`${BASE_URL}/assets/${assetId}/thumb?time=${timecodeSeconds}`, {
        headers: headers(),
      })
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json()
        if (thumbData.url || thumbData.thumb_url || thumbData.src) {
          return {
            url: thumbData.url || thumbData.thumb_url || thumbData.src,
            source: 'frame',
          }
        }
      }
    } catch {
      // Not available — fall through
    }

    // Fall back to poster thumbnail
    if (asset.thumbUrl) {
      return { url: asset.thumbUrl, source: 'poster' }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Download an image from a URL and return it as a Buffer.
 */
export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeAsset(raw: any): FrameIoAsset {
  return {
    id: raw.id,
    name: raw.name || 'Untitled',
    type: raw.type || 'file',
    duration: typeof raw.duration === 'number' ? raw.duration : null,
    thumbUrl: raw.thumb || raw.thumb_url || raw.thumbnail_url || null,
    proxyUrl: raw.proxy || raw.proxy_url || null,
    originalUrl: raw.original || raw.original_url || null,
    hlsUrl: raw.hls_manifest || raw.hls_url || null,
  }
}

/**
 * Format seconds to HH:MM:SS:FF timecode (at 24fps).
 */
export function formatTimecode(seconds: number, fps = 24): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

/**
 * Detect if a string contains a Frame.io URL and return the parsed info.
 * Supports:
 *   - Full URLs: https://app.frame.io/reviews/... , https://app.frame.io/player/...
 *   - Short links: https://f.io/xxxxx
 *   - Slack-formatted: <https://f.io/xxx|f.io/xxx>
 */
export function detectFrameIoLink(text: string): {
  type: 'review' | 'asset' | 'short'
  id: string
  url: string
} | null {
  // Match Frame.io URLs: frame.io or f.io domains
  const urlMatch = text.match(/<?(https?:\/\/[^\s>|]*(?:frame\.io|f\.io)[^\s>|]*)>?/)
  if (!urlMatch) return null

  const url = urlMatch[1]

  // Check for full review URL
  const reviewId = parseReviewUrl(url)
  if (reviewId) return { type: 'review', id: reviewId, url }

  // Check for full asset/player URL
  const assetId = parseAssetUrl(url)
  if (assetId) return { type: 'asset', id: assetId, url }

  // Check for short link (f.io/xxxxx)
  const shortMatch = url.match(/f\.io\/([a-zA-Z0-9]+)/i)
  if (shortMatch) return { type: 'short', id: shortMatch[1], url }

  return null
}

/**
 * Resolve a short Frame.io link (f.io/xxx) by following the redirect
 * to get the full URL, then parse that.
 */
export async function resolveShortLink(shortUrl: string): Promise<{
  type: 'review' | 'asset'
  id: string
  url: string
} | null> {
  try {
    // Follow redirect but don't download the page
    const res = await fetch(shortUrl, { redirect: 'follow' })
    const finalUrl = res.url

    console.log('[FrameIO] Short link resolved:', shortUrl, '->', finalUrl)

    const reviewId = parseReviewUrl(finalUrl)
    if (reviewId) return { type: 'review', id: reviewId, url: finalUrl }

    const assetId = parseAssetUrl(finalUrl)
    if (assetId) return { type: 'asset', id: assetId, url: finalUrl }

    // If the final URL has /reviews/ or /player/ in a different format, try broader match
    // Frame.io review URLs sometimes have extra path segments
    const anyReviewMatch = finalUrl.match(/frame\.io.*?\/reviews?\/([a-f0-9-]+)/i)
    if (anyReviewMatch) return { type: 'review', id: anyReviewMatch[1], url: finalUrl }

    const anyPlayerMatch = finalUrl.match(/frame\.io.*?\/player\/([a-f0-9-]+)/i)
    if (anyPlayerMatch) return { type: 'asset', id: anyPlayerMatch[1], url: finalUrl }

    // Last resort: try to extract any UUID-like ID from the URL
    const uuidMatch = finalUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
    if (uuidMatch) return { type: 'review', id: uuidMatch[1], url: finalUrl }

    console.warn('[FrameIO] Could not parse resolved URL:', finalUrl)
    return null
  } catch (err: any) {
    console.error('[FrameIO] Short link resolution failed:', err?.message)
    return null
  }
}
