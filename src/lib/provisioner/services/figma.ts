import { withRetry } from '../retry'
import type { ServiceResult, ProjectIntakeForm } from '../types'
import { buildProjectLabel } from '../types'

const BASE_URL = 'https://api.figma.com/v1'

function headers() {
  return {
    'X-Figma-Token': process.env.FIGMA_TOKEN ?? '',
    'Content-Type': 'application/json',
  }
}

export async function provisionFigma(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  const templateFileKey = process.env.FIGMA_TEMPLATE_FILE_KEY ?? ''
  const label = buildProjectLabel(form)

  try {
    if (dryRun) {
      return { service: 'FigJam', success: true, url: 'https://www.figma.com/file/dry-run' }
    }

    const dupData = await withRetry(() =>
      fetch(`${BASE_URL}/files/${templateFileKey}/duplicate`, {
        method: 'POST',
        headers: headers(),
        body: '{}',
      }).then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
        return r.json()
      })
    )

    const newFileKey: string = dupData.key

    await withRetry(() =>
      fetch(`${BASE_URL}/files/${newFileKey}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ name: label }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
      })
    )

    return { service: 'FigJam', success: true, url: `https://www.figma.com/file/${newFileKey}`, id: newFileKey }
  } catch (err) {
    return { service: 'FigJam', success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
