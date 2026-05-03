import { withRetry } from '../retry'
import type { ServiceResult, ProjectIntakeForm } from '../types'
import { buildProjectLabel } from '../types'
import folderStructure from '../folder-structure.json'

const BASE_URL = 'https://api.frame.io/v2'

function headers() {
  return {
    Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function provisionFrameIo(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  const teamId = process.env.FRAMEIO_TEAM_ID ?? ''
  const label = buildProjectLabel(form)

  try {
    if (dryRun) {
      return { service: 'FrameIo', success: true, url: 'https://app.frame.io/projects/dry-run' }
    }

    const project = await withRetry(() =>
      fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: label, team_id: teamId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
        return r.json()
      })
    )

    const projectId: string = project.id
    const rootAssetId: string = project.root_asset_id

    await Promise.allSettled(
      folderStructure.frameio.map((folderName) =>
        withRetry(() =>
          fetch(`${BASE_URL}/assets`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ name: folderName, type: 'folder', parent_id: rootAssetId }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
          })
        )
      )
    )

    return { service: 'FrameIo', success: true, url: `https://app.frame.io/projects/${projectId}`, id: projectId }
  } catch (err) {
    return { service: 'FrameIo', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
