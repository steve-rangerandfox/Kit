// src/orchestrator/index.ts

import {
  OrchestratorContext,
  ProvisioningResults,
  ServiceResult,
  ServiceKey,
  NotionLinkProperties,
} from './types';
import { provisionDropbox }   from '../services/dropbox';
import { provisionFrameIo }   from '../services/frameio';
import { provisionCanva }     from '../services/canva';
import { provisionOneDrive }  from '../services/onedrive';
import { provisionClockify }  from '../services/clockify';
import { provisionFigma }     from '../services/figma';
import { createNotionPage, patchNotionPageWithLinks } from '../services/notion';
import { provisionTeamsChat } from '../services/teams';
import { logger }             from '../utils/logger';

export type ProgressCallback = (phase: string, message: string) => Promise<void>;

/** Returns a skipped result for services the user deselected */
function skipped(service: ServiceResult['service']): ServiceResult {
  return { service, success: false, error: 'skipped' };
}

/** Resolves a settled promise, converting rejections to failure ServiceResults */
function extractResult(
  settled: PromiseSettledResult<ServiceResult>,
  fallbackService: ServiceResult['service']
): ServiceResult {
  if (settled.status === 'fulfilled') return settled.value;
  const message = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
  logger.error(`Orchestrator: ${fallbackService} promise rejected`, { message });
  return { service: fallbackService, success: false, error: message };
}

/**
 * Orchestrates full project provisioning.
 *
 * Only runs services that appear in form.selectedServices.
 *
 * Phase 1 (parallel): Dropbox, Frame.io, Canva, OneDrive, Clockify, FigJam
 * Phase 2 (sequential): Notion page creation
 * Phase 3 (sequential): Teams chat creation
 * Phase 4 (sequential): Notion page patch with all collected links
 */
export async function runOrchestrator(
  ctx: OrchestratorContext,
  onProgress?: ProgressCallback
): Promise<ProvisioningResults> {
  const { form, dryRun } = ctx;
  const { projectName, clientName, selectedServices } = form;
  const sel = new Set<ServiceKey>(selectedServices);
  const results: ProvisioningResults = {};

  logger.info('Orchestrator: starting provisioning', {
    projectName,
    clientName,
    selectedServices,
    dryRun,
  });

  // ─── PHASE 1: Parallel provisioning ─────────────────────────────────────────

  // Build human-readable list of what's actually running
  const phase1Services = ['Dropbox', 'Frame.io', 'Canva', 'OneDrive', 'Clockify', 'FigJam']
    .filter((_, i) => {
      const keys: ServiceKey[] = ['dropbox', 'frameio', 'canva', 'onedrive', 'clockify', 'figma'];
      return sel.has(keys[i]);
    })
    .join(', ');

  await onProgress?.(
    'phase1',
    `⚙️ Provisioning infrastructure for **${projectName}**…\n${phase1Services || 'No phase 1 services selected.'}`
  );

  // Wrap each service: if not selected, resolve immediately with a skipped result
  const maybeRun = <T extends ServiceResult>(
    key: ServiceKey,
    fn: () => Promise<T>,
    fallback: T['service']
  ): Promise<T> =>
    sel.has(key) ? fn() : Promise.resolve(skipped(fallback) as T);

  const [
    dropboxResult,
    frameioResult,
    canvaResult,
    onedriveResult,
    clockifyResult,
    figmaResult,
  ] = await Promise.allSettled([
    maybeRun('dropbox',  () => provisionDropbox(projectName, clientName, dryRun),   'Dropbox'),
    maybeRun('frameio',  () => provisionFrameIo(projectName, clientName, dryRun),   'FrameIo'),
    maybeRun('canva',    () => provisionCanva(projectName, clientName, dryRun),      'Canva'),
    maybeRun('onedrive', () => provisionOneDrive(projectName, clientName, dryRun),  'OneDrive'),
    maybeRun('clockify', () => provisionClockify(projectName, clientName, dryRun),  'Clockify'),
    maybeRun('figma',    () => provisionFigma(projectName, clientName, dryRun),     'FigJam'),
  ]);

  results.dropbox  = extractResult(dropboxResult,  'Dropbox');
  results.frameio  = extractResult(frameioResult,  'FrameIo');
  results.canva    = extractResult(canvaResult,    'Canva');
  results.onedrive = extractResult(onedriveResult, 'OneDrive');
  results.clockify = extractResult(clockifyResult, 'Clockify');
  results.figma    = extractResult(figmaResult,    'FigJam');

  await onProgress?.('phase1_complete', buildPhase1Summary(results, sel));
  logger.info('Orchestrator: phase 1 complete');

  // ─── PHASE 2: Create Notion page ────────────────────────────────────────────

  if (sel.has('notion')) {
    await onProgress?.('phase2', '📓 Creating Notion project page…');
    const notionResult = await createNotionPage(form, dryRun);
    results.notion = notionResult;
    logger.info('Orchestrator: Notion page created', { url: notionResult.url });
  } else {
    results.notion = skipped('Notion');
    logger.info('Orchestrator: Notion skipped (not selected)');
  }

  // ─── PHASE 3: Create Teams chat ─────────────────────────────────────────────

  if (sel.has('teams')) {
    await onProgress?.('phase3', '💬 Setting up Teams project chat…');
    const teamsResult = await provisionTeamsChat(form, dryRun);
    results.teams = teamsResult;
    logger.info('Orchestrator: Teams chat created', { url: teamsResult.url });
  } else {
    results.teams = skipped('Teams');
    logger.info('Orchestrator: Teams chat skipped (not selected)');
  }

  // ─── PHASE 4: Patch Notion with all links ────────────────────────────────────
  // Only runs if Notion was selected AND the page was created successfully

  if (sel.has('notion') && results.notion?.success && results.notion.id) {
    await onProgress?.('phase4', '🔗 Linking all services to Notion…');

    const linkProperties: NotionLinkProperties = {
      dropboxUrl:  results.dropbox?.url,
      frameioUrl:  results.frameio?.url,
      teamsUrl:    results.teams?.url,
      canvaUrl:    results.canva?.url,
      onedriveUrl: results.onedrive?.url,
      clockifyUrl: results.clockify?.url,
      figjamUrl:   results.figma?.url,
    };

    try {
      await patchNotionPageWithLinks(results.notion.id, linkProperties, dryRun);
      logger.info('Orchestrator: Notion page patched with all links');
    } catch (err) {
      logger.error('Orchestrator: failed to patch Notion links', { error: err });
    }
  }

  logger.info('Orchestrator: provisioning complete', { results });
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPhase1Summary(results: ProvisioningResults, sel: Set<ServiceKey>): string {
  const services: Array<{ label: string; key: ServiceKey; r: ServiceResult | undefined }> = [
    { label: 'Dropbox',  key: 'dropbox',  r: results.dropbox },
    { label: 'Frame.io', key: 'frameio',  r: results.frameio },
    { label: 'Canva',    key: 'canva',    r: results.canva },
    { label: 'OneDrive', key: 'onedrive', r: results.onedrive },
    { label: 'Clockify', key: 'clockify', r: results.clockify },
    { label: 'FigJam',   key: 'figma',    r: results.figma },
  ];

  const lines = services.map(({ label, key, r }) => {
    if (!sel.has(key)) return `⏭ ${label}: skipped`;
    if (!r)            return `⏳ ${label}: pending`;
    return r.success   ? `✅ ${label}` : `❌ ${label}: ${r.error ?? 'unknown error'}`;
  });

  return `**Phase 1 complete:**\n${lines.join('\n')}`;
}
