// src/services/notion.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult, NotionLinkProperties, ProjectIntakeForm } from '../orchestrator/types';

const BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

/**
 * Creates a new Notion project page in the projects database.
 * Returns the page ID and URL for later patching.
 */
export async function createNotionPage(form: ProjectIntakeForm, dryRun = false): Promise<ServiceResult & { pageId?: string }> {
  const dbId = process.env.NOTION_PROJECTS_DB_ID ?? '';

  try {
    if (dryRun) {
      logger.info('[DRY RUN] Notion: would create page', { project: form.projectName });
      return {
        service: 'Notion',
        success: true,
        url: 'https://notion.so/dry-run-page',
        id: 'dry-run-page-id',
        pageId: 'dry-run-page-id',
      };
    }

    const response = await withRetry(
      () =>
        axios.post(
          `${BASE_URL}/pages`,
          {
            parent: { database_id: dbId },
            properties: {
              // "Name" is the default title property in most Notion databases
              Name: {
                title: [{ text: { content: `${form.clientName} — ${form.projectName}` } }],
              },
              'Project Type': {
                select: { name: form.projectType },
              },
              Status: {
                select: { name: 'Active' },
              },
              'Start Date': form.startDate
                ? { date: { start: form.startDate } }
                : undefined,
              Deadline: form.deadline
                ? { date: { start: form.deadline } }
                : undefined,
              'Project Manager': {
                rich_text: [{ text: { content: form.projectManager } }],
              },
              Description: form.description
                ? { rich_text: [{ text: { content: form.description } }] }
                : undefined,
            },
          },
          { headers: getHeaders() }
        ),
      { onRetry: (a, e) => logger.warn(`Notion page create retry ${a}`, { error: e.message }) }
    );

    const page = response.data;
    const pageId: string = page.id;
    const url: string = page.url;

    logger.serviceResult('Notion', true, url);
    return { service: 'Notion', success: true, url, id: pageId, pageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('Notion', false, message);
    return { service: 'Notion', success: false, error: message };
  }
}

/**
 * Patches an existing Notion page with links from all provisioned services.
 */
export async function patchNotionPageWithLinks(
  pageId: string,
  links: NotionLinkProperties,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    logger.info('[DRY RUN] Notion: would patch page with links', { pageId, links });
    return;
  }

  const urlProperty = (url?: string) =>
    url ? { url } : undefined;

  const properties: Record<string, unknown> = {};

  if (links.dropboxUrl)   properties['Dropbox']   = urlProperty(links.dropboxUrl);
  if (links.frameioUrl)   properties['Frame.io']  = urlProperty(links.frameioUrl);
  if (links.teamsUrl)     properties['Teams Chat'] = urlProperty(links.teamsUrl);
  if (links.canvaUrl)     properties['Canva']     = urlProperty(links.canvaUrl);
  if (links.onedriveUrl)  properties['OneDrive']  = urlProperty(links.onedriveUrl);
  if (links.clockifyUrl)  properties['Clockify']  = urlProperty(links.clockifyUrl);
  if (links.figjamUrl)    properties['FigJam']    = urlProperty(links.figjamUrl);

  await withRetry(
    () =>
      axios.patch(
        `${BASE_URL}/pages/${pageId}`,
        { properties },
        { headers: getHeaders() }
      ),
    { onRetry: (a, e) => logger.warn(`Notion patch retry ${a}`, { error: e.message }) }
  );

  logger.info('Notion: page patched with all links', { pageId });
}
