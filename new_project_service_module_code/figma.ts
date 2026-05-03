// src/services/figma.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';

const BASE_URL = 'https://api.figma.com/v1';

function getHeaders() {
  return {
    'X-Figma-Token': process.env.FIGMA_TOKEN ?? '',
    'Content-Type': 'application/json',
  };
}

/**
 * Duplicates the template FigJam file into the team project
 * and renames it for the new project.
 */
export async function provisionFigma(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const templateFileKey = process.env.FIGMA_TEMPLATE_FILE_KEY ?? '';
  const teamId = process.env.FIGMA_TEAM_ID ?? '';
  const newName = `${projectName} — ${clientName} — FigJam`;

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Figma: would duplicate template', { newName });
      return {
        service: 'FigJam',
        success: true,
        url: `https://www.figma.com/file/dry-run-key`,
      };
    }

    // Step 1: duplicate template file
    const duplicateResponse = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/files/${templateFileKey}/duplicate`,
          {},
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Figma duplicate retry ${a}`, { error: e.message }) }
    );

    const newFileKey: string = duplicateResponse.data.key;
    logger.info('Figma: file duplicated', { newFileKey });

    // Step 2: rename the duplicated file
    await withRetry(
      () =>
        axios.patch(
          `${BASE_URL}/files/${newFileKey}`,
          { name: newName },
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Figma rename retry ${a}`, { error: e.message }) }
    );

    // Step 3: move to the correct team project (optional but tidy)
    // Figma v1 doesn't have a direct move; file is already in the user's drafts.
    // For team project organization, you'd use the team projects endpoint.

    const url = `https://www.figma.com/file/${newFileKey}`;
    logger.serviceResult('FigJam', true, url);
    return { service: 'FigJam', success: true, url, id: newFileKey };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('FigJam', false, message);
    return { service: 'FigJam', success: false, error: message };
  }
}
