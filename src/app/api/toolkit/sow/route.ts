// @ts-nocheck
/**
 * Statement of Work (SOW) generation API
 * POST /api/toolkit/sow
 * Generates professional SOW documents from project data using Claude Sonnet
 */

import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPrompt, getVoiceForSurface } from '@/lib/agent/personality';
import { sowGenerationPrompt } from '@/lib/agent/prompts';
import type { Project, Milestone, Deliverable, TeamMember } from '@/types/database';

interface SOWRequest {
  projectId: string;
  workspaceId: string;
}

interface SOWResponse {
  content: string;
  metadata: {
    generatedAt: string;
    model: string;
    documentId?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SOWRequest;
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

    // Fetch workspace for personality config
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces' as any)
      .select('name, settings')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Client info is in the project record

    // Fetch deliverables
    const { data: deliverables, error: delivError } = await supabase
      .from('deliverables' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (delivError) {
      return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
    }

    // Fetch milestones
    const { data: milestones, error: milesError } = await supabase
      .from('milestones' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (milesError) {
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
    }

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from('team_members' as any)
      .select('*')
      .eq('workspace_id', workspaceId);

    // Build project context for the prompt
    const projectContext = buildProjectContext({
      project: project as Project,
      deliverables: deliverables as Deliverable[],
      milestones: milestones as Milestone[],
      teamMembers: teamMembers as TeamMember[],
    });

    // Build the prompt with personality
    const personalityConfig = (workspace.settings as any)?.personality || {
      formality: 75,
      playfulness: 20,
    };

    const workspaceContext = {
      personality: personalityConfig,
      name: workspace.name,
    };

    const fullPrompt = buildPrompt(workspaceContext, sowGenerationPrompt(projectContext), 'chat');

    // Call Claude Sonnet
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: fullPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a professional Statement of Work for this project. The document should be clear, client-facing, and suitable for signing. Format with proper sections and professional language.`,
        },
      ],
    });

    // Extract the generated content
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const sowContent = textContent.text;

    // Save to generated_documents table
    const { data: savedDoc, error: saveError } = await supabase
      .from('generated_documents' as any)
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        doc_type: 'statement_of_work',
        content: sowContent,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-sonnet-4-20250514',
        },
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Failed to save generated document:', saveError);
      // Still return the content even if saving fails
    }

    const response: SOWResponse = {
      content: sowContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
        documentId: savedDoc?.id,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('SOW generation error:', error);

    const message = error instanceof Error ? error.message : 'Failed to generate SOW';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Builds a comprehensive project context string for the SOW prompt
 */
function buildProjectContext(data: {
  project: Project;
  deliverables: Deliverable[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
}): string {
  const { project, deliverables, milestones, teamMembers } = data;

  const lines: string[] = [];

  lines.push('PROJECT INFORMATION');
  lines.push(`- Name: ${project.name}`);
  lines.push(`- Description: ${project.description || 'N/A'}`);
  lines.push(`- Budget: ${project.currency || 'USD'} ${project.budget?.toLocaleString() || 'TBD'}`);
  lines.push(`- Start Date: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}`);
  lines.push(`- Deadline: ${project.deadline ? new Date(project.deadline).toLocaleDateString() : new Date(project.end_date).toLocaleDateString()}`);
  lines.push('');

  if (project.client_name) {
    lines.push('CLIENT INFORMATION');
    lines.push(`- Name: ${project.client_name}`);
    lines.push('');
  }

  if (deliverables.length > 0) {
    lines.push('DELIVERABLES');
    for (const deliv of deliverables) {
      lines.push(`- ${deliv.name} (${deliv.format})`);
      if (deliv.description) lines.push(`  Description: ${deliv.description}`);
      lines.push(`  Due Date: ${new Date(deliv.due_date).toLocaleDateString()}`);
    }
    lines.push('');
  }

  if (milestones.length > 0) {
    lines.push('MILESTONES');
    for (const milestone of milestones) {
      lines.push(`- ${milestone.name}`);
      lines.push(`  Due Date: ${new Date(milestone.due_date).toLocaleDateString()}`);
      if (milestone.description) lines.push(`  Description: ${milestone.description}`);
    }
    lines.push('');
  }

  if (teamMembers.length > 0) {
    lines.push('TEAM');
    for (const member of teamMembers.slice(0, 5)) {
      lines.push(`- ${member.name} (${member.role})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
