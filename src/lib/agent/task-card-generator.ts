// @ts-nocheck
/**
 * Daily task card generation system
 * Creates personalized daily cards for team members based on assignments and priorities
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface TaskItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  type: 'milestone' | 'deliverable' | 'feedback' | 'workback_task';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: Date;
  daysUntil: number;
  context: string;
}

export interface DailyTaskCard {
  id?: string;
  workspaceId: string;
  teamMemberId: string;
  date: Date;
  status: 'draft' | 'approved' | 'distributed';
  tasks: TaskItem[];
  contextSummary: string;
  reviewerNotes?: string;
  distributedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a personalized daily task card for a team member
 */
export async function generateTaskCard(
  workspaceId: string,
  teamMemberId: string,
  date: Date
): Promise<DailyTaskCard> {
  const admin = createAdminClient();
  const tasks: TaskItem[] = [];

  // Get team member info
  const { data: teamMember, error: memberError } = await admin
    .from('team_members' as any)
    .select('id, name, role, email')
    .eq('id', teamMemberId)
    .single();

  if (memberError || !teamMember) {
    throw new Error(`Failed to fetch team member: ${memberError?.message}`);
  }

  // Get all project assignments for this team member
  const { data: projectAccess } = await admin
    .from('project_access' as any)
    .select('project_id')
    .eq('team_member_id', teamMemberId);

  const projectIds = projectAccess?.map((p: any) => p.project_id) || [];

  if (projectIds.length === 0) {
    // No projects assigned
    return {
      workspaceId,
      teamMemberId,
      date,
      status: 'draft',
      tasks: [],
      contextSummary: 'No active projects assigned',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Get upcoming milestones for assigned projects
  const { data: milestones } = await admin
    .from('milestones' as any)
    .select('id, name, project_id, due_date, status, progress_percentage')
    .in('project_id', projectIds)
    .neq('status', 'completed');

  if (milestones) {
    for (const milestone of milestones) {
      const dueDate = new Date(milestone.due_date);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Include milestones due within 7 days or overdue
      if (daysUntil <= 7 && daysUntil >= -1) {
        const { data: project } = await admin
          .from('projects' as any)
          .select('id, name')
          .eq('id', milestone.project_id)
          .single();

        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (daysUntil <= 0) priority = 'critical';
        else if (daysUntil <= 2) priority = 'high';
        else if (daysUntil >= 5) priority = 'low';

        tasks.push({
          id: milestone.id,
          title: `Milestone: ${milestone.name}`,
          projectId: milestone.project_id,
          projectName: project?.name || 'Unknown',
          type: 'milestone',
          priority,
          dueDate,
          daysUntil,
          context: `Progress: ${milestone.progress_percentage}%${daysUntil < 0 ? ` (${Math.abs(daysUntil)} days overdue!)` : ''}`,
        });
      }
    }
  }

  // Get deliverables assigned to this team member due soon
  const { data: deliverables } = await admin
    .from('deliverables' as any)
    .select('id, name, project_id, due_date, status')
    .in('project_id', projectIds)
    .eq('assigned_to', teamMemberId)
    .in('status', ['not_started', 'in_progress', 'in_review']);

  if (deliverables) {
    for (const deliverable of deliverables) {
      const dueDate = new Date(deliverable.due_date);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Include deliverables due within 5 days or overdue
      if (daysUntil <= 5 && daysUntil >= -1) {
        const { data: project } = await admin
          .from('projects' as any)
          .select('id, name')
          .eq('id', deliverable.project_id)
          .single();

        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (daysUntil <= 0) priority = 'critical';
        else if (daysUntil <= 1) priority = 'high';

        tasks.push({
          id: deliverable.id,
          title: `Deliverable: ${deliverable.name}`,
          projectId: deliverable.project_id,
          projectName: project?.name || 'Unknown',
          type: 'deliverable',
          priority,
          dueDate,
          daysUntil,
          context: `Status: ${deliverable.status}`,
        });
      }
    }
  }

  // Get unresolved high-priority feedback assigned to this team member
  const { data: feedback } = await admin
    .from('feedback_items' as any)
    .select('id, content, project_id, priority, created_at')
    .in('project_id', projectIds)
    .eq('assigned_to_id', teamMemberId)
    .in('status', ['open', 'addressed'])
    .in('priority', ['high', 'critical']);

  if (feedback) {
    for (const item of feedback) {
      const createdDate = new Date(item.created_at);
      const daysOld = Math.ceil(
        (date.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      const { data: project } = await admin
        .from('projects' as any)
        .select('id, name')
        .eq('id', item.project_id)
        .single();

      tasks.push({
        id: item.id,
        title: `Feedback: ${item.content.substring(0, 50)}...`,
        projectId: item.project_id,
        projectName: project?.name || 'Unknown',
        type: 'feedback',
        priority: item.priority as 'critical' | 'high',
        dueDate: createdDate,
        daysUntil: -daysOld,
        context: `${daysOld} days old - needs response`,
      });
    }
  }

  // Get workback schedule tasks for today
  const { data: workbackTasks } = await admin
    .from('workback_schedule' as any)
    .select('id, task_name, project_id, scheduled_date, is_complete')
    .in('project_id', projectIds)
    .eq('scheduled_date', date.toISOString().split('T')[0])
    .eq('is_complete', false)
    .eq('assigned_to', teamMemberId);

  if (workbackTasks) {
    for (const task of workbackTasks) {
      const { data: project } = await admin
        .from('projects' as any)
        .select('id, name')
        .eq('id', task.project_id)
        .single();

      tasks.push({
        id: task.id,
        title: `Today: ${task.task_name}`,
        projectId: task.project_id,
        projectName: project?.name || 'Unknown',
        type: 'workback_task',
        priority: 'high',
        dueDate: date,
        daysUntil: 0,
        context: 'Scheduled for today',
      });
    }
  }

  // Sort tasks by priority and due date
  tasks.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.daysUntil - b.daysUntil;
  });

  // Build context summary
  const criticalCount = tasks.filter((t) => t.priority === 'critical').length;
  const highCount = tasks.filter((t) => t.priority === 'high').length;

  const contextSummary = `
${teamMember.name}'s Daily Card - ${date.toLocaleDateString()}
${tasks.length} task(s) today: ${criticalCount} critical, ${highCount} high-priority
${projectIds.length} active project(s)
  `.trim();

  const card: DailyTaskCard = {
    workspaceId,
    teamMemberId,
    date,
    status: 'draft',
    tasks,
    contextSummary,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return card;
}

/**
 * Generate daily task cards for all team members in a workspace
 */
export async function generateAllCards(
  workspaceId: string,
  date: Date
): Promise<DailyTaskCard[]> {
  const admin = createAdminClient();

  // Get all active team members
  const { data: teamMembers, error: memberError } = await admin
    .from('team_members' as any)
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (memberError || !teamMembers) {
    throw new Error(`Failed to fetch team members: ${memberError?.message}`);
  }

  const cards: DailyTaskCard[] = [];

  for (const member of teamMembers) {
    try {
      const card = await generateTaskCard(workspaceId, (member as any).id, date);
      cards.push(card);
    } catch (error) {
      console.error(`Failed to generate card for team member ${(member as any).id}:`, error);
    }
  }

  return cards;
}

/**
 * Move a card from draft to approved status
 */
export async function approveCard(
  cardId: string,
  reviewerNotes?: string
): Promise<DailyTaskCard> {
  const admin = createAdminClient();

  const { data: card, error } = await admin
    .from('daily_task_cards' as any)
    .update({
      status: 'approved',
      reviewer_notes: reviewerNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error || !card) {
    throw new Error(`Failed to approve card: ${error?.message}`);
  }

  return convertDatabaseCard(card);
}

/**
 * Move a card from approved to distributed status
 * In production, this would trigger a Slack DM or similar
 */
export async function distributeCard(cardId: string): Promise<DailyTaskCard> {
  const admin = createAdminClient();

  const { data: card, error } = await admin
    .from('daily_task_cards' as any)
    .update({
      status: 'distributed',
      distributed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error || !card) {
    throw new Error(`Failed to distribute card: ${error?.message}`);
  }

  return convertDatabaseCard(card);
}

/**
 * Helper to convert database card record to DailyTaskCard type
 */
function convertDatabaseCard(dbCard: any): DailyTaskCard {
  return {
    id: dbCard.id,
    workspaceId: dbCard.workspace_id,
    teamMemberId: dbCard.team_member_id,
    date: new Date(dbCard.date),
    status: dbCard.status,
    tasks: dbCard.tasks || [],
    contextSummary: dbCard.context_summary,
    reviewerNotes: dbCard.reviewer_notes,
    distributedAt: dbCard.distributed_at ? new Date(dbCard.distributed_at) : undefined,
    createdAt: new Date(dbCard.created_at),
    updatedAt: new Date(dbCard.updated_at),
  };
}
