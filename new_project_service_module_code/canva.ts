// src/services/canva.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';

const BASE_URL = 'https://api.canva.com/rest/v1';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CANVA_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a new Canva folder under the studio root folder.
 */
export async function provisionCanva(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const rootFolderId = process.env.CANVA_ROOT_FOLDER_ID ?? '';

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Canva: would create folder', { projectName, clientName });
      return {
        service: 'Canva',
        success: true,
        url: 'https://www.canva.com/folder/dry-run-id',
      };
    }

    const response = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/folders`,
          {
            name: `${clientName} — ${projectName}`,
            parentFolderId: rootFolderId,
          },
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Canva folder create retry ${a}`, { error: e.message }) }
    );

    const folder = response.data.folder;
    const folderId: string = folder.id;
    const url = `https://www.canva.com/folder/${folderId}`;

    logger.serviceResult('Canva', true, url);
    return { service: 'Canva', success: true, url, id: folderId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('Canva', false, message);
    return { service: 'Canva', success: false, error: message };
  }
}
