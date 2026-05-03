import { withRetry } from '../retry'
import type { ServiceResult, ProjectIntakeForm } from '../types'
import { buildProjectLabel } from '../types'
import folderStructure from '../folder-structure.json'

const BASE_URL = 'https://api.clockify.me/api/v1'

function headers() {
  return {
    'X-Api-Key': process.env.CLOCKIFY_API_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

export async function provisionClockify(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID ?? ''
  const label = buildProjectLabel(form)

  try {
    if (dryRun) {
      return { service: 'Clockify', success: true, url: 'https://app.clockify.me/projects/dry-run' }
    }

    const project = await withRetry(() =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: label,
          color: '#4A90E2',
          billable: true,
          isPublic: false,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
        return r.json()
      })
    )

    const projectId: string = project.id

    await Promise.allSettled(
      folderStructure.clockifyTasks.map((taskName) =>
        withRetry(() =>
          fetch(`${BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ name: taskName }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
          })
        )
      )
    )

    return { service: 'Clockify', success: true, url: `https://app.clockify.me/projects/${projectId}`, id: projectId }
  } catch (err) {
    return { service: 'Clockify', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
