// @ts-nocheck
/**
 * Frame.io Agent — Review & Approval Expert
 *
 * Knows everything about Frame.io: review projects, comment extraction,
 * approval status, version tracking, and asset management.
 * Kit routes any review/approval/feedback question here.
 */

import { withRetry } from '@/lib/provisioner/retry'
import folderStructure from '@/lib/provisioner/folder-structure.json'
import type { AgentDefinition, AgentResult } from './types'

const FRAMEIO_API = 'https://api.frame.io/v2'

function frameHeaders() {
  return {
    Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function frameGet(path: string): Promise<any> {
  return withRetry(() =>
    fetch(`${FRAMEIO_API}${path}`, {
      headers: frameHeaders(),
      signal: AbortSignal.timeout(15_000),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
      return r.json()
    })
  )
}

async function framePost(path: string, body: Record<string, unknown>): Promise<any> {
  return withRetry(() =>
    fetch(`${FRAMEIO_API}${path}`, {
      method: 'POST',
      headers: frameHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
      return r.json()
    })
  )
}

// ─── Action Handlers ───────────────────────────────────────

async function provision(payload: Record<string, unknown>): Promise<AgentResult> {
  const projectLabel = payload.projectCode
    ? `${payload.projectCode}_${payload.client}_${payload.projectName}`
    : `${payload.client}_${payload.projectName}`

  try {
    const project = await framePost('/projects', {
      name: projectLabel,
      team_id: process.env.FRAMEIO_TEAM_ID,
    })

    const folders = folderStructure.frameio || []
    const results = await Promise.allSettled(
      folders.map((name: string) =>
        framePost('/assets', {
          name,
          type: 'folder',
          parent_id: project.root_asset_id,
        })
      )
    )

    const created = results.filter((r) => r.status === 'fulfilled').length

    return {
      agent: 'frameio',
      action: 'provision',
      success: true,
      url: `https://app.frame.io/projects/${project.id}`,
      id: project.id,
      message: `Created Frame.io project "${projectLabel}" with ${created}/${folders.length} folders`,
      data: { rootAssetId: project.root_asset_id, foldersCreated: created },
    }
  } catch (err: any) {
    return { agent: 'frameio', action: 'provision', success: false, error: err.message }
  }
}

async function getComments(payload: Record<string, unknown>): Promise<AgentResult> {
  try {
    const assetId = payload.assetId as string
    const comments = await frameGet(`/assets/${assetId}/comments`)

    const parsed = (Array.isArray(comments) ? comments : []).map((c: any) => ({
      id: c.id,
      text: c.text,
      author: c.owner?.name || c.owner?.email || 'Unknown',
      timestamp: c.timestamp,
      createdAt: c.created_at,
      hasAnnotation: !!c.annotation,
      completed: c.completed,
    }))

    return {
      agent: 'frameio',
      action: 'get_comments',
      success: true,
      message: `${parsed.length} comments on asset`,
      data: { assetId, comments: parsed },
    }
  } catch (err: any) {
    return { agent: 'frameio', action: 'get_comments', success: false, error: err.message }
  }
}

async function getProject(payload: Record<string, unknown>): Promise<AgentResult> {
  try {
    const projectId = payload.projectId as string
    const project = await frameGet(`/projects/${projectId}`)

    return {
      agent: 'frameio',
      action: 'get_project',
      success: true,
      url: `https://app.frame.io/projects/${project.id}`,
      message: `Project: ${project.name}`,
      data: {
        id: project.id,
        name: project.name,
        rootAssetId: project.root_asset_id,
        createdAt: project.created_at,
      },
    }
  } catch (err: any) {
    return { agent: 'frameio', action: 'get_project', success: false, error: err.message }
  }
}

async function listAssets(payload: Record<string, unknown>): Promise<AgentResult> {
  try {
    const parentId = payload.parentId as string
    const assets = await frameGet(`/assets/${parentId}/children`)

    const parsed = (Array.isArray(assets) ? assets : []).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.label,
      commentCount: a.comment_count,
      versions: a.versions,
      createdAt: a.created_at,
    }))

    return {
      agent: 'frameio',
      action: 'list_assets',
      success: true,
      message: `${parsed.length} assets found`,
      data: { assets: parsed },
    }
  } catch (err: any) {
    return { agent: 'frameio', action: 'list_assets', success: false, error: err.message }
  }
}

async function getReviewStatus(payload: Record<string, unknown>): Promise<AgentResult> {
  try {
    const projectId = payload.projectId as string
    const project = await frameGet(`/projects/${projectId}`)
    const rootAssets = await frameGet(`/assets/${project.root_asset_id}/children`)

    // Recursively count assets with comments, approvals, etc.
    const summary = {
      totalAssets: 0,
      withComments: 0,
      totalComments: 0,
      approved: 0,
      needsReview: 0,
    }

    for (const asset of (Array.isArray(rootAssets) ? rootAssets : [])) {
      if (asset.type === 'file') {
        summary.totalAssets++
        if (asset.comment_count > 0) {
          summary.withComments++
          summary.totalComments += asset.comment_count
        }
        if (asset.label === 'approved') summary.approved++
        else if (asset.label === 'needs_review') summary.needsReview++
      }
    }

    return {
      agent: 'frameio',
      action: 'get_review_status',
      success: true,
      message: `${summary.totalAssets} assets: ${summary.approved} approved, ${summary.needsReview} need review, ${summary.totalComments} total comments`,
      data: { projectId, ...summary },
    }
  } catch (err: any) {
    return { agent: 'frameio', action: 'get_review_status', success: false, error: err.message }
  }
}

// ─── Agent Definition ──────────────────────────────────────

export const frameioAgent: AgentDefinition = {
  id: 'frameio',
  name: 'Frame.io Agent',
  domain: 'Frame.io',
  expertise:
    'Video review and approval workflows, client feedback, frame-accurate comments, asset versions, and review status tracking. Ask me about review comments, approval status, what feedback the client left, or to set up a new review project.',
  requiredEnvVars: ['FRAMEIO_TOKEN', 'FRAMEIO_TEAM_ID'],
  capabilities: [
    {
      action: 'provision',
      description: 'Create a new Frame.io project with standard review folder structure',
      mutates: true,
    },
    {
      action: 'get_comments',
      description: 'Get all review comments on a specific asset (video/image)',
      inputDescription: 'assetId (Frame.io asset UUID)',
      mutates: false,
    },
    {
      action: 'get_project',
      description: 'Get details of a Frame.io project',
      inputDescription: 'projectId (Frame.io project UUID)',
      mutates: false,
    },
    {
      action: 'list_assets',
      description: 'List all assets (files/folders) inside a parent folder or project root',
      inputDescription: 'parentId (asset UUID of the parent folder)',
      mutates: false,
    },
    {
      action: 'get_review_status',
      description: 'Get a summary of review status across all assets in a project — how many approved, need review, total comments',
      inputDescription: 'projectId (Frame.io project UUID)',
      mutates: false,
    },
  ],
  handler: async (action, payload) => {
    switch (action) {
      case 'provision':
        return provision(payload)
      case 'get_comments':
        return getComments(payload)
      case 'get_project':
        return getProject(payload)
      case 'list_assets':
        return listAssets(payload)
      case 'get_review_status':
        return getReviewStatus(payload)
      default:
        return { agent: 'frameio', action, success: false, error: `Unknown action: ${action}` }
    }
  },
}
