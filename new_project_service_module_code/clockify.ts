// src/services/clockify.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';
import folderStructure from '../templates/folderStructure.json';

const BASE_URL = 'https://api.clockify.me/api/v1';

function getHeaders() {
  return {
    'X-Api-Key': process.env.CLOCKIFY_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a Clockify project and optional default tasks.
 */
export async function provisionClockify(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID ?? '';

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Clockify: would create project', { projectName, clientName });
      return {
        service: 'Clockify',
        success: true,
        url: 'https://app.clockify.me/projects/dry-run-id',
      };
    }

    const projectResponse = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/workspaces/${workspaceId}/projects`,
          {
            name: `${clientName} — ${projectName}`,
            color: '#4A90E2',
            billable: true,
            isPublic: false,
          },
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Clockify create retry ${a}`, { error: e.message }) }
    );

    const projectId: string = projectResponse.data.id;
    logger.info('Clockify: project created', { projectId });

    // Create default tasks in parallel
    const taskNames: string[] = folderStructure.clockifyTasks;
    await Promise.allSettled(
      taskNames.map((taskName) =>
        withRetry(() =>
          axios.post(
            `${BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks`,
            { name: taskName },
            { headers: getHeaders() }
          )
        )
      )
    );

    logger.info('Clockify: default tasks created', { count: taskNames.length });

    const url = `https://app.clockify.me/projects/${projectId}`;
    logger.serviceResult('Clockify', true, url);
    return { service: 'Clockify', success: true, url, id: projectId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('Clockify', false, message);
    return { service: 'Clockify', success: false, error: message };
  }
}
