#!/usr/bin/env ts-node
// scripts/test-run.ts
//
// Integration test script that exercises the full orchestrator.
//
// Usage:
//   npx ts-node scripts/test-run.ts                    # live run with [TEST] prefix
//   npx ts-node scripts/test-run.ts --dry-run          # logs all calls without executing
//   npx ts-node scripts/test-run.ts --project "My Q4 Sizzle"  # custom project name

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { runOrchestrator } from '../src/orchestrator';
import { OrchestratorContext, ProjectIntakeForm } from '../src/orchestrator/types';
import { logger } from '../src/utils/logger';

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const projectArgIdx = args.indexOf('--project');
const customProject = projectArgIdx !== -1 ? args[projectArgIdx + 1] : undefined;

// ─── Test form data ──────────────────────────────────────────────────────────

const testForm: ProjectIntakeForm = {
  projectName: customProject ?? `[TEST] Integration Run ${new Date().toISOString().slice(0, 10)}`,
  clientName: '[TEST] Test Client',
  projectType: 'Motion Graphics',
  projectManager: process.env.TEST_PM_EMAIL ?? 'pm@studio.com',
  teamMembers: (process.env.TEST_TEAM_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean),
  startDate: new Date().toISOString().slice(0, 10),
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  description: 'Automated integration test run. Safe to delete.',
};

const ctx: OrchestratorContext = {
  form: testForm,
  conversationId: 'integration-test',
  serviceUrl: 'https://smba.trafficmanager.net/teams/',
  tenantId: process.env.AZURE_TENANT_ID ?? '',
  dryRun,
};

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log(`║  New Project Provisioner — Integration Test          ║`);
console.log(`║  Mode: ${dryRun ? 'DRY RUN (no API calls)           ' : 'LIVE (real API calls)             '}║`);
console.log('╚══════════════════════════════════════════════════════╝\n');

logger.info('Test run config', {
  projectName: testForm.projectName,
  clientName: testForm.clientName,
  dryRun,
});

async function main(): Promise<void> {
  const start = Date.now();

  const results = await runOrchestrator(ctx, async (phase, message) => {
    console.log(`\n[${phase}] ${message}`);
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const services: Array<[string, (typeof results)[keyof typeof results]]> = [
    ['Dropbox',  results.dropbox],
    ['Frame.io', results.frameio],
    ['Canva',    results.canva],
    ['OneDrive', results.onedrive],
    ['Clockify', results.clockify],
    ['FigJam',   results.figma],
    ['Notion',   results.notion],
    ['Teams',    results.teams],
  ];

  let allPassed = true;
  for (const [label, result] of services) {
    if (!result) {
      console.log(`  ⏳ ${label.padEnd(12)} skipped`);
      continue;
    }
    if (result.success) {
      console.log(`  ✅ ${label.padEnd(12)} ${result.url ?? ''}`);
    } else {
      console.log(`  ❌ ${label.padEnd(12)} ${result.error ?? 'unknown error'}`);
      allPassed = false;
    }
  }

  console.log(`\n  Completed in ${elapsed}s`);
  console.log(`  Status: ${allPassed ? '✅ ALL PASSED' : '⚠️  PARTIAL FAILURE'}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  logger.error('Integration test crashed', { err });
  process.exit(1);
});
