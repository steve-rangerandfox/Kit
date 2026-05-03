// @ts-nocheck
/**
 * Trust-gradient autonomy system for Kit
 * Determines what level of autonomy Kit has for different action types
 * Uses a safety-first approach with hard gates for client-facing actions
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type ActionType =
  | 'status_update'
  | 'reminder'
  | 'daily_briefing'
  | 'budget_alert'
  | 'schedule_alert'
  | 'feedback_triage'
  | 'client_email'
  | 'sow_document'
  | 'workback_schedule'
  | 'scope_alert'
  | 'task_card'
  | 'meeting_prep';

export type AutonomyLevel = 'ask_first' | 'auto_draft' | 'auto_send';

/**
 * Actions that directly face the client
 * These have strict safety gates - can never auto-send
 */
export const CLIENT_FACING_ACTIONS: ActionType[] = [
  'client_email',
  'sow_document',
  'workback_schedule',
  'scope_alert',
  'task_card',
  'meeting_prep',
];

/**
 * HARD GATE: Enforce safety rails on autonomy levels
 * Client-facing actions can NEVER be auto-sent, only drafted
 */
export function enforceSafetyRails(
  actionType: ActionType,
  requestedLevel: AutonomyLevel
): AutonomyLevel {
  const isClientFacing = CLIENT_FACING_ACTIONS.includes(actionType);

  if (isClientFacing && requestedLevel === 'auto_send') {
    // HARD GATE: Downgrade to auto_draft
    // Client-facing communication always requires human review
    return 'auto_draft';
  }

  return requestedLevel;
}

/**
 * Get the autonomy level for a specific action
 * Uses a fallback chain: project-specific → workspace-wide → default (ask_first)
 */
export async function getAutonomyLevel(
  workspaceId: string,
  projectId: string | null,
  actionType: ActionType
): Promise<AutonomyLevel> {
  const admin = createAdminClient();

  // Try project-specific setting first (if projectId provided)
  if (projectId) {
    const { data: projectSetting } = await admin
      .from('autonomy_settings' as any)
      .select('autonomy_level')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('action_type', actionType)
      .maybeSingle();

    if (projectSetting) {
      return enforceSafetyRails(
        actionType,
        projectSetting.autonomy_level as AutonomyLevel
      );
    }
  }

  // Fall back to workspace-wide setting
  const { data: workspaceSetting } = await admin
    .from('autonomy_settings' as any)
    .select('autonomy_level')
    .eq('workspace_id', workspaceId)
    .is('project_id', null)
    .eq('action_type', actionType)
    .maybeSingle();

  if (workspaceSetting) {
    return enforceSafetyRails(
      actionType,
      workspaceSetting.autonomy_level as AutonomyLevel
    );
  }

  // Default: always ask first (safest)
  return 'ask_first';
}

/**
 * Check if an action should be automatically executed
 * This means fully auto-send without human review
 */
export function shouldAutoExecute(level: AutonomyLevel): boolean {
  return level === 'auto_send';
}

/**
 * Check if an action should be auto-drafted
 * This means generate and present to human for review/approval
 */
export function shouldAutoDraft(level: AutonomyLevel): boolean {
  return level === 'auto_draft' || level === 'auto_send';
}

/**
 * Presets for common workspace setups
 * Can be used to initialize autonomy_settings
 */
export const AUTONOMY_PRESETS = {
  conservative: {
    description: 'Always ask first - maximum human control',
    settings: {
      status_update: 'ask_first',
      reminder: 'ask_first',
      daily_briefing: 'ask_first',
      budget_alert: 'ask_first',
      schedule_alert: 'ask_first',
      feedback_triage: 'ask_first',
      client_email: 'ask_first',
      sow_document: 'ask_first',
      workback_schedule: 'ask_first',
      scope_alert: 'ask_first',
      task_card: 'ask_first',
      meeting_prep: 'ask_first',
    } as Record<ActionType, AutonomyLevel>,
  },

  balanced: {
    description: 'Auto-draft most things, ask first for client-facing',
    settings: {
      status_update: 'auto_draft',
      reminder: 'auto_draft',
      daily_briefing: 'auto_draft',
      budget_alert: 'auto_draft',
      schedule_alert: 'auto_draft',
      feedback_triage: 'auto_draft',
      client_email: 'ask_first',
      sow_document: 'ask_first',
      workback_schedule: 'ask_first',
      scope_alert: 'ask_first',
      task_card: 'ask_first',
      meeting_prep: 'ask_first',
    } as Record<ActionType, AutonomyLevel>,
  },

  aggressive: {
    description: 'Auto-draft everything, auto-send internal communications',
    settings: {
      status_update: 'auto_send',
      reminder: 'auto_send',
      daily_briefing: 'auto_draft', // Still draft - high visibility
      budget_alert: 'auto_draft', // Still draft - financial impact
      schedule_alert: 'auto_draft', // Still draft - timeline critical
      feedback_triage: 'auto_draft',
      client_email: 'auto_draft', // Hard gated to draft
      sow_document: 'auto_draft',
      workback_schedule: 'auto_draft',
      scope_alert: 'auto_draft',
      task_card: 'auto_send',
      meeting_prep: 'auto_draft',
    } as Record<ActionType, AutonomyLevel>,
  },
} as const;
