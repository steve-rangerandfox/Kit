import { withRetry } from '../retry'
import type { ServiceResult, ProjectIntakeForm } from '../types'
import { buildProjectLabel } from '../types'

const BASE_URL = 'https://api.canva.com/rest/v1'

function headers() {
  return {
    Authorization: `Bearer ${process.env.CANVA_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function provisionCanva(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  const rootFolderId = process.env.CANVA_ROOT_FOLDER_ID ?? ''
  const label = buildProjectLabel(form)

  try {
    if (dryRun) {
      return { service: 'Canva', success: true, url: 'https://www.canva.com/folder/dry-run' }
    }

    const data = await withRetry(() =>
      fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: label, parentFolderId: rootFolderId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
        return r.json()
      })
    )

    const folderId: string = data.folder.id
    return { service: 'Canva', success: true, url: `https://www.canva.com/folder/${folderId}`, id: folderId }
  } catch (err) {
    return { service: 'Canva', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
