// @ts-nocheck
/**
 * Workback schedule generation API
 * POST /api/toolkit/workback
 * Generates detailed workback schedules using Claude Opus with extended thinking
 */

import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPrompt } from '@/lib/agent/personality';
import { workbackGenerationPrompt } from '@/lib/agent/prompts';
import type { Project, Milestone, Deliverable, TeamMember } from '@/types/database';

interface WorkbackRequest {
  projectId: string;
  workspaceId: string;
}

export interface WorkbackScheduleTask {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  owner_role: string;
  dependencies: string[];
  milestones_completed: string[];
  is_critical_path: boolean;
  risk_factors: string[];
}

export interface WorkbackSchedulePhase {
  name: string;
  start_date: string;
  end_date: string;
  tasks: WorkbackScheduleTask[];
  buffer_days: number;
  buffer_reason: string;
}

export interface WorkbackSchedule {
  phases: WorkbackSchedulePhase[];
  critical_path: string[];
  total_duration_days: number;
  key_risks: string[];
  assumptions: string[];
}

interface WorkbackResponse {
  schedule: WorkbackSchedule;
  confidenceScore: number;
  riskFlags: string[];
  metadata: {
    generatedAt: string;
    model: string;
    thinkingUsed: boolean;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as WorkbackRequest;
    const { projectId, workspaceId } = body;

    // Validate required fields
    if (!projectId || !workspaceId) {
      return NextResponse.json({ error: 'projectId and workspaceId are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects' as any)
      .select('*')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch workspace
    const { data: workspace } = await supabase.from('workspaces' as any).select('name, settings').eq('id', workspaceId).single();

    // Fetch milestones
    const { data: milestones } = await supabase
      .from('milestones' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    // Fetch deliverables
    const { data: deliverables } = await supabase
      .from('deliverables' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    // Fetch team to understand team size
    const { data: teamMembers } = await supabase
      .from('team_members' as any)
      .select('*')
      .eq('workspace_id', workspaceId);

    // Build project context
    const projectContext = buildProjectContext({
      project: project as Project,
      milestones: milestones || [],
      deliverables: deliverables || [],
      teamSize: teamMembers?.length || 3,
    });

    // Build the prompt with personality
    const personalityConfig = (workspace?.settings as any)?.personality || {
      formality: 75,
      playfulness: 20,
    };

    const workspaceContext = {
      personality: personalityConfig,
      name: workspace?.name || 'Studio',
    };

    const fullPrompt = buildPrompt(workspaceContext, workbackGenerationPrompt(projectContext), 'chat');

    // Call Claude Opus with extended thinking
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-opus-4-6-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: fullPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a detailed workback schedule for this project. Think deeply about dependencies, buffers, risk factors, and the critical path. Return your final response as valid JSON matching the schedule structure.`,
        },
      ],
    });

    // Extract thinking and text content
    let thinkingUsed = false;
    let scheduleData: WorkbackSchedule | null = null;

    for (const block of message.content) {
      if (block.type === 'thinking') {
        thinkingUsed = true;
      } else if (block.type === 'text') {
        // Parse the JSON from the response
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scheduleData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse schedule JSON:', e);
          }
        }
      }
    }

    if (!scheduleData) {
      return NextResponse.json({ error: 'Failed to generate workback schedule' }, { status: 500 });
    }

    // Calculate confidence score based on schedule completeness
    const confidenceScore = calculateConfidenceScore(scheduleData);

    // Extract risk flags
    const riskFlags = scheduleData.key_risks || [];

    // Save to workback_schedules table
    const { error: saveError } = await supabase.from('workback_schedules' as any).insert({
      project_id: projectId,
      workspace_id: workspaceId,
      schedule: scheduleData,
      confidence_score: confidenceScore,
    });

    if (saveError) {
      console.error('Failed to save workback schedule:', saveError);
      // Continue anyway - still return the generated data
    }

    const response: WorkbackResponse = {
      schedule: scheduleData,
      confidenceScore,
      riskFlags,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'claude-opus-4-6-20250514',
        thinkingUsed,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Workback generation error:', error);

    const message = error instanceof Error ? error.message : 'Failed to generate workback schedule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Calculates confidence score based on schedule completeness
 */
function calculateConfidenceScore(schedule: WorkbackSchedule): number {
  let score = 100;

  // Deduct points for missing information
  if (!schedule.phases || schedule.phases.length === 0) score -= 40;
  if (!schedule.critical_path || schedule.critical_path.length === 0) score -= 20;
  if (!schedule.key_risks || schedule.key_risks.length === 0) score -= 10;

  // Check each phase for completeness
  for (const phase of schedule.phases || []) {
    if (!phase.tasks || phase.tasks.length === 0) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Builds project context for workback generation
 */
function buildProjectContext(data: {
  project: Project;
  milestones: Milestone[];
  deliverables: Deliverable[];
  teamSize: number;
}): string {
  const { project, milestones, deliverables, teamSize } = data;

  const lines: string[] = [];

  lines.push('PROJECT BRIEF');
  lines.push(`Name: ${project.name}`);
  lines.push(`Status: ${project.status}`);
  lines.push(`Phase: ${project.phase}`);

  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  lines.push(`Duration: ${durationDays} days (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()})`);
  lines.push(`Budget: ${project.budget?.toLocaleString() || 'TBD'}`);
  lines.push(`Team Size: ${teamSize} people`);
  lines.push('');

  if (deliverables.length > 0) {
    lines.push('DELIVERABLES');
    for (const deliv of deliverables) {
      lines.push(`- ${deliv.name} (${deliv.format})`);
      lines.push(`  Due: ${new Date(deliv.due_date).toLocaleDateString()}`);
    }
    lines.push('');
  }

  if (milestones.length > 0) {
    lines.push('MILESTONES');
    for (const milestone of milestones) {
      lines.push(`- ${milestone.name}`);
      lines.push(`  Due: ${new Date(milestone.due_date).toLocaleDateString()}`);
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        lines.push(`  Depends on: ${milestone.dependencies.join(', ')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
