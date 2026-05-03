// src/services/onedrive.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';
import { getGraphToken } from './graphAuth';
import folderStructure from '../templates/folderStructure.json';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Creates a project folder tree in OneDrive under the studio shared drive.
 */
export async function provisionOneDrive(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const driveId = process.env.ONEDRIVE_DRIVE_ID ?? '';
  const rootFolderId = process.env.ONEDRIVE_ROOT_FOLDER_ID ?? '';
  const folderName = `${clientName} — ${projectName}`;

  try {
    if (dryRun) {
      logger.info('[DRY RUN] OneDrive: would create folder', { folderName });
      return {
        service: 'OneDrive',
        success: true,
        url: 'https://onedrive.live.com/dry-run',
      };
    }

    const token = await getGraphToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 1: create root project folder
    const rootResponse = await withRetry(
      () =>
        axios.post(
          `${GRAPH_BASE}/drives/${driveId}/items/${rootFolderId}/children`,
          {
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          },
          { headers }
        ),
      {
        onRetry: (a, e) =>
          logger.warn(`OneDrive root folder create retry ${a}`, { error: e.message }),
      }
    );

    const rootItem = rootResponse.data;
    const rootItemId: string = rootItem.id;
    const webUrl: string = rootItem.webUrl;

    logger.info('OneDrive: root folder created', { rootItemId, webUrl });

    // Step 2: create subfolders from template
    type SubfolderDef = { name: string; children?: string[] };
    const subfolders = folderStructure.onedrive as SubfolderDef[];

    for (const sub of subfolders) {
      const subResponse = await withRetry(
        () =>
          axios.post(
            `${GRAPH_BASE}/drives/${driveId}/items/${rootItemId}/children`,
            { name: sub.name, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' },
            { headers }
          ),
        { onRetry: (a, e) => logger.warn(`OneDrive subfolder retry ${a}`, { error: e.message }) }
      );

      if (sub.children?.length) {
        const subItemId: string = subResponse.data.id;
        await Promise.allSettled(
          sub.children.map((childName) =>
            withRetry(
              () =>
                axios.post(
                  `${GRAPH_BASE}/drives/${driveId}/items/${subItemId}/children`,
                  { name: childName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' },
                  { headers }
                )
            )
          )
        );
      }
    }

    logger.serviceResult('OneDrive', true, webUrl);
    return { service: 'OneDrive', success: true, url: webUrl, id: rootItemId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('OneDrive', false, message);
    return { service: 'OneDrive', success: false, error: message };
  }
}
