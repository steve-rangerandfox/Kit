// src/services/dropbox.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';

const BASE_URL = 'https://api.dropboxapi.com/2';
const CONTENT_URL = 'https://content.dropboxapi.com/2';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Copies the master template folder to /Clients/{clientName}/{projectName}
 * then creates and returns a shared link for the new folder.
 */
export async function provisionDropbox(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const templatePath = process.env.DROPBOX_TEMPLATE_PATH ?? '/_TEMPLATES/New Project Template';
  const destPath = `/Clients/${clientName}/${projectName}`;

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Dropbox: would copy template', { templatePath, destPath });
      return { service: 'Dropbox', success: true, url: `https://dropbox.com/home${destPath}` };
    }

    // Step 1: copy template folder
    await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/files/copy_v2`,
          { from_path: templatePath, to_path: destPath, allow_ownership_transfer: false },
          { headers: getHeaders() }
        ),
      {
        onRetry: (attempt, err) =>
          logger.warn(`Dropbox copy retry ${attempt}`, { error: err.message }),
      }
    );

    logger.info('Dropbox: folder copied', { destPath });

    // Step 2: create shared link
    const linkResponse = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/sharing/create_shared_link_with_settings`,
          { path: destPath, settings: { requested_visibility: 'team_only' } },
          { headers: getHeaders() }
        ),
      {
        onRetry: (attempt, err) =>
          logger.warn(`Dropbox shared link retry ${attempt}`, { error: err.message }),
      }
    );

    const url: string = linkResponse.data.url;
    logger.serviceResult('Dropbox', true, url);
    return { service: 'Dropbox', success: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('Dropbox', false, message);
    return { service: 'Dropbox', success: false, error: message };
  }
}
