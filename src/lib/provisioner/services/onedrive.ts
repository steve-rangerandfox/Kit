import { withRetry } from '../retry'
import { getGraphToken } from './graph-auth'
import type { ServiceResult, ProjectIntakeForm } from '../types'
import { buildProjectLabel } from '../types'
import folderStructure from '../folder-structure.json'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export async function provisionOneDrive(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID ?? ''
  const rootFolderId = process.env.ONEDRIVE_ROOT_FOLDER_ID ?? ''
  const label = buildProjectLabel(form)

  try {
    if (dryRun) {
      return { service: 'OneDrive', success: true, url: 'https://onedrive.live.com/dry-run' }
    }

    const token = await getGraphToken()
    const hdrs = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const createFolder = (parentId: string, name: string) =>
      withRetry(() =>
        fetch(`${GRAPH_BASE}/drives/${driveId}/items/${parentId}/children`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
          return r.json()
        })
      )

    const rootItem = await createFolder(rootFolderId, label)
    const rootItemId: string = rootItem.id
    const webUrl: string = rootItem.webUrl

    type SubfolderDef = { name: string; children?: string[] }
    const subfolders = folderStructure.onedrive as SubfolderDef[]

    for (const sub of subfolders) {
      const subItem = await createFolder(rootItemId, sub.name)
      if (sub.children?.length) {
        await Promise.allSettled(
          sub.children.map((childName) => createFolder(subItem.id, childName))
        )
      }
    }

    return { service: 'OneDrive', success: true, url: webUrl, id: rootItemId }
  } catch (err) {
    return { service: 'OneDrive', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
