// src/services/frameio.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';
import folderStructure from '../templates/folderStructure.json';

const BASE_URL = 'https://api.frame.io/v2';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a new Frame.io project and standard subfolder structure.
 */
export async function provisionFrameIo(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const teamId = process.env.FRAMEIO_TEAM_ID ?? '';

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Frame.io: would create project', { projectName, clientName });
      return {
        service: 'FrameIo',
        success: true,
        url: 'https://app.frame.io/projects/dry-run-id',
      };
    }

    // Step 1: create project
    const projectResponse = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/projects`,
          {
            name: `${clientName} — ${projectName}`,
            team_id: teamId,
          },
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Frame.io project create retry ${a}`, { error: e.message }) }
    );

    const project = projectResponse.data;
    const projectId: string = project.id;
    const rootAssetId: string = project.root_asset_id;

    logger.info('Frame.io: project created', { projectId });

    // Step 2: create subfolders in parallel
    const subfolders: string[] = folderStructure.frameio;
    await Promise.allSettled(
      subfolders.map((folderName) =>
        withRetry(
          () =>
            axios.post(
              `${BASE_URL}/assets`,
              { name: folderName, type: 'folder', parent_id: rootAssetId },
              { headers: getHeaders() }
            ),
          {
            onRetry: (a, e) =>
              logger.warn(`Frame.io subfolder '${folderName}' retry ${a}`, { error: e.message }),
          }
        )
      )
    );

    logger.info('Frame.io: subfolders created', { count: subfolders.length });

    const url = `https://app.frame.io/projects/${projectId}`;
    logger.serviceResult('FrameIo', true, url);
    return { service: 'FrameIo', success: true, url, id: projectId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('FrameIo', false, message);
    return { service: 'FrameIo', success: false, error: message };
  }
}
