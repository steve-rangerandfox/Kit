// @ts-nocheck
/**
 * Slack Block Kit Builders
 *
 * Constructs Block Kit formatted responses for various notifications
 * and interactions. All builders return arrays of Slack blocks.
 *
 * @module slack/blocks
 */

import { buildPrompt, getVoiceForSurface } from '@/lib/agent/personality';
import type { Workspace, Project, KitAction } from '@/types/database';

/**
 * Build morning briefing blocks
 *
 * Includes:
 * - Personalized greeting
 * - Active projects summary (with health indicators)
 * - Today's priorities
 * - Pending actions count
 * - Quick action buttons
 *
 * @param workspace - Workspace config with personality
 * @param projects - Active projects
 * @param actions - Pending actions
 * @returns Array of Block Kit blocks
 */
export function buildDailyBriefing(
  workspace: Workspace,
  projects: Project[],
  actions: KitAction[]
): any[] {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Get personality for this surface
  const modulated = getVoiceForSurface(
    workspace.settings?.personality || { formality: 50, playfulness: 50 },
    'daily_briefing'
  );

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${greeting}, ${workspace.name}!`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Here's your production dashboard for today. You have *${projects.length}* active projects and *${actions.length}* actions pending.`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Projects summary
  if (projects.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Active Projects*',
      },
    });

    projects.slice(0, 5).forEach((project) => {
      const healthEmoji = getProjectHealthEmoji(project);
      const status = formatProjectStatus(project);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${healthEmoji} *${project.name}*\n${status}`,
        },
      });
    });

    if (projects.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `+${projects.length - 5} more projects`,
          },
        ],
      });
    }
  }

  blocks.push({ type: 'divider' });

  // Pending actions
  if (actions.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *${actions.length} Pending Actions*\nReview and approve suggested actions.`,
      },
    });
  }

  // Quick actions
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Dashboard',
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Review Actions',
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL}/actions`,
      },
    ],
  });

  return blocks;
}

/**
 * Build budget alert notification blocks
 *
 * Warns when project spending approaches budget threshold
 *
 * @param project - Project with budget data
 * @param threshold - Percentage threshold (e.g., 0.8 for 80%)
 * @returns Array of Block Kit blocks
 */
export function buildBudgetAlert(
  project: Project,
  threshold: number = 0.8
): any[] {
  const budget = project.budget || 0;
  const spent = 0; // Would fetch from database
  const percentage = budget > 0 ? spent / budget : 0;

  const emoji = percentage > 0.9 ? '🔴' : percentage > threshold ? '🟡' : '🟢';
  const status =
    percentage > 0.9
      ? 'Critical'
      : percentage > threshold
        ? 'Warning'
        : 'Healthy';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Budget Alert: ${project.name}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status*\n${status}`,
        },
        {
          type: 'mrkdwn',
          text: `*Spent*\n$${spent.toLocaleString()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Budget*\n$${budget.toLocaleString()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Used*\n${Math.round(percentage * 100)}%`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Remaining: $${Math.max(0, budget - spent).toLocaleString()}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Project',
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Review Spending',
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/budget`,
        },
      ],
    },
  ];
}

/**
 * Build action breakdown blocks with approve/dismiss buttons
 *
 * Shows suggested actions from Kit agent with decision buttons
 *
 * @param breakdown - Action breakdown data
 * @returns Array of Block Kit blocks
 */
export function buildActionBreakdown(breakdown: {
  title: string;
  description: string;
  actions: Array<{ id: string; title: string; description: string }>;
  projectId?: string;
}): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: breakdown.title,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: breakdown.description,
      },
    },
    {
      type: 'divider',
    },
  ];

  // List actions
  breakdown.actions.forEach((action) => {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${action.title}*\n${action.description}`,
      },
    });
  });

  // Action buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Approve All',
        },
        style: 'primary',
        action_id: `action_approve_${breakdown.projectId}`,
        value: 'approve',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Review Details',
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${breakdown.projectId}/actions`,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Dismiss',
        },
        action_id: `action_dismiss_${breakdown.projectId}`,
        value: 'dismiss',
      },
    ],
  });

  return blocks;
}

/**
 * Build single project status card
 *
 * Shows project overview with key metrics
 *
 * @param project - Project data
 * @returns Array of Block Kit blocks
 */
export function buildProjectStatus(project: Project): any[] {
  const healthEmoji = getProjectHealthEmoji(project);
  const phaseEmoji = getPhaseEmoji(project.phase);

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${healthEmoji} *${project.name}*`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status*\n${formatStatus(project.status)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Phase*\n${phaseEmoji} ${formatPhase(project.phase)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Client*\n${project.client_name || 'Internal'}`,
        },
        {
          type: 'mrkdwn',
          text: `*End Date*\n${formatDate(project.end_date)}`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: project.description || 'No description',
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}`,
        },
      ],
    },
  ];
}

/**
 * Get health emoji for project status
 */
function getProjectHealthEmoji(project: Project): string {
  if (project.status === 'completed') return '✅';
  if (project.status === 'on_hold' || project.status === 'cancelled') return '⛔';
  if (project.status === 'in_review') return '👀';
  if (project.status === 'in_progress') return '🟢';
  return '🟡'; // planning
}

/**
 * Get emoji for project phase
 */
function getPhaseEmoji(phase: string): string {
  const emojiMap: Record<string, string> = {
    pre_production: '📋',
    production: '🎬',
    post_production: '✏️',
    delivery: '📦',
  };
  return emojiMap[phase] || '❓';
}

/**
 * Format project status for display
 */
function formatProjectStatus(project: Project): string {
  const phase = formatPhase(project.phase);
  const status = formatStatus(project.status);
  const daysRemaining = getDaysUntilDeadline(project.end_date);

  let message = `${status} • Phase: ${phase}`;
  if (daysRemaining > 0) {
    message += ` • ${daysRemaining} days remaining`;
  }

  return message;
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Format phase for display
 */
function formatPhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    pre_production: 'Pre-Production',
    production: 'Production',
    post_production: 'Post-Production',
    delivery: 'Delivery',
  };
  return phaseMap[phase] || phase;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate days until deadline
 */
function getDaysUntilDeadline(deadline: Date | string): number {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const today = new Date();
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
