// src/bot/summaryCard.ts

import { ProvisioningResults, ProjectIntakeForm, ServiceKey } from '../orchestrator/types';

interface LinkItem {
  label: string;
  key: ServiceKey;
  url?: string;
  skipped: boolean;
  failed: boolean;
  errorMsg?: string;
}

function buildLinkItems(
  results: ProvisioningResults,
  selected: Set<ServiceKey>
): LinkItem[] {
  const rows: Array<{ label: string; key: ServiceKey; r: ProvisioningResults[keyof ProvisioningResults] }> = [
    { label: '📓 Notion',   key: 'notion',   r: results.notion },
    { label: '📦 Dropbox',  key: 'dropbox',  r: results.dropbox },
    { label: '🎬 Frame.io', key: 'frameio',  r: results.frameio },
    { label: '💾 OneDrive', key: 'onedrive', r: results.onedrive },
    { label: '💬 Teams',    key: 'teams',    r: results.teams },
    { label: '🎨 Canva',    key: 'canva',    r: results.canva },
    { label: '⏱ Clockify', key: 'clockify', r: results.clockify },
    { label: '📐 FigJam',   key: 'figma',    r: results.figma },
  ];

  return rows.map(({ label, key, r }) => {
    const wasSelected = selected.has(key);
    return {
      label,
      key,
      url:      r?.url,
      skipped:  !wasSelected,
      failed:   wasSelected && !(r?.success ?? false),
      errorMsg: r?.error,
    };
  });
}

function overallStatus(items: LinkItem[]): 'success' | 'partial' {
  const active = items.filter((i) => !i.skipped);
  if (active.length === 0) return 'success';
  return active.every((i) => !i.failed) ? 'success' : 'partial';
}

/**
 * Builds the final summary Adaptive Card payload.
 * Skipped services render as neutral "⏭ Not provisioned" — they do not
 * affect the success/failure badge.
 */
export function buildSummaryCard(
  form: ProjectIntakeForm,
  results: ProvisioningResults
): Record<string, unknown> {
  const selected = new Set<ServiceKey>(form.selectedServices);
  const items = buildLinkItems(results, selected);
  const status = overallStatus(items);

  const statusText  = status === 'success' ? '✅ All Systems Go' : '⚠️ Partial Success';
  const statusColor = status === 'success' ? 'Good' : 'Warning';
  const notionUrl   = results.notion?.url ?? '';
  const activeCount = form.selectedServices.length;

  const tableRows = items.map((item) => {
    let statusCell: Record<string, unknown>;

    if (item.skipped) {
      statusCell = {
        type: 'TextBlock',
        text: '⏭ Not provisioned',
        isSubtle: true,
        wrap: false,
      };
    } else if (item.failed) {
      statusCell = {
        type: 'TextBlock',
        text: `⚠️ Failed — retry manually${item.errorMsg ? `: ${item.errorMsg}` : ''}`,
        color: 'Attention',
        wrap: true,
      };
    } else {
      statusCell = {
        type: 'TextBlock',
        text: `[Open ↗](${item.url})`,
        color: 'Good',
        wrap: false,
      };
    }

    return {
      type: 'TableRow',
      cells: [
        {
          type: 'TableCell',
          items: [{ type: 'TextBlock', text: item.label, wrap: false }],
        },
        {
          type: 'TableCell',
          items: [statusCell],
        },
      ],
    };
  });

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        style: 'emphasis',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  { type: 'TextBlock', text: '🚀 Project Provisioned', weight: 'Bolder', size: 'Large' },
                  {
                    type: 'TextBlock',
                    text: `${form.clientName} — ${form.projectName}`,
                    isSubtle: true,
                    wrap: true,
                    spacing: 'None',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: statusText,
                    color: statusColor,
                    weight: 'Bolder',
                    horizontalAlignment: 'Right',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'FactSet',
        spacing: 'Medium',
        facts: [
          { title: 'Project Type',    value: form.projectType },
          { title: 'Project Manager', value: form.projectManager },
          ...(form.startDate ? [{ title: 'Start Date', value: form.startDate }] : []),
          ...(form.deadline  ? [{ title: 'Deadline',   value: form.deadline }]  : []),
          { title: 'Services', value: `${activeCount} of 8 provisioned` },
        ],
      },
      {
        type: 'TextBlock',
        text: 'SERVICE LINKS',
        weight: 'Bolder',
        size: 'Small',
        spacing: 'Medium',
      },
      {
        type: 'Table',
        firstRowAsHeaders: false,
        columns: [{ width: 1 }, { width: 2 }],
        rows: tableRows,
      },
    ],
    actions: notionUrl
      ? [{ type: 'Action.OpenUrl', title: '📓 View Notion Page', url: notionUrl, style: 'positive' }]
      : [],
  };
}
