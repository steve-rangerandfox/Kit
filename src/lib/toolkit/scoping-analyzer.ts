/**
 * Scoping transcript analyzer
 * Extracts structured project data from scoping call transcripts using Claude
 */

import { Anthropic } from '@anthropic-ai/sdk';

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface Timeline {
  start_date?: string; // ISO date
  deadline: string; // ISO date
  estimated_duration_days: number;
}

export interface ClientInfo {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  company?: string;
  decision_maker?: string;
}

export interface DeliverableItem {
  name: string;
  description: string;
  format?: string;
  specifications?: Record<string, string>;
  approvals_required?: number;
}

export interface RevisionExpectation {
  revision_rounds: number;
  unlimited_revisions?: boolean;
  scope_change_handling: 'formal_request' | 'included' | 'undefined';
  revision_policy?: string;
}

export interface ScopingData {
  client_info: ClientInfo;
  project_name: string;
  project_type: string;
  project_description?: string;

  budget: BudgetRange;
  timeline: Timeline;

  deliverables: DeliverableItem[];
  revision_expectations: RevisionExpectation;

  technical_requirements?: string[];
  team_structure?: string;
  communication_preferences?: {
    primary_channel: string;
    check_in_cadence?: string;
    stakeholders: string[];
  };

  assumptions?: string[];
  constraints?: string[];
  red_flags?: string[];

  confidence_level: 'high' | 'medium' | 'low';
  extracted_at: Date;
}

/**
 * Analyzes a scoping call transcript and extracts structured data
 * Uses Claude to understand conversational context and extract key information
 *
 * @param transcript The raw transcript text from the scoping call
 * @returns Promise resolving to structured scoping data
 * @throws Error if extraction fails or transcript is invalid
 */
export async function analyzeScopingTranscript(transcript: string): Promise<ScopingData> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript cannot be empty');
  }

  const client = new Anthropic();

  const systemPrompt = `You are an expert project scoping analyst. Your job is to extract structured project information from scoping call transcripts.

Extract the following information if mentioned:
- Client name, contact info, decision maker
- Project name, type, and description
- Budget range (minimum and maximum) and currency
- Timeline (start date, deadline, estimated duration)
- All deliverables with descriptions and specifications
- Revision expectations and approval process
- Technical requirements
- Communication preferences and check-in cadence
- Team structure and roles
- Any assumptions, constraints, or red flags
- Overall confidence in the completeness and clarity of the scope

Be conservative with confidence levels:
- HIGH: Budget, timeline, deliverables, revisions clearly defined
- MEDIUM: Some items unclear or partially defined
- LOW: Significant ambiguity or missing information

Return your analysis as a valid JSON object matching the structure provided.`;

  const userPrompt = `Analyze this scoping call transcript and extract all relevant project information:

---TRANSCRIPT START---
${transcript}
---TRANSCRIPT END---

Extract and structure this information in JSON format with these fields:
{
  "client_info": {
    "name": string,
    "contact_email": string | null,
    "contact_phone": string | null,
    "company": string | null,
    "decision_maker": string | null
  },
  "project_name": string,
  "project_type": string,
  "project_description": string | null,
  "budget": {
    "min": number,
    "max": number,
    "currency": string
  },
  "timeline": {
    "start_date": string | null (ISO date),
    "deadline": string (ISO date),
    "estimated_duration_days": number
  },
  "deliverables": [
    {
      "name": string,
      "description": string,
      "format": string | null,
      "specifications": {} | null,
      "approvals_required": number | null
    }
  ],
  "revision_expectations": {
    "revision_rounds": number | null,
    "unlimited_revisions": boolean | null,
    "scope_change_handling": "formal_request" | "included" | "undefined",
    "revision_policy": string | null
  },
  "technical_requirements": [string] | null,
  "team_structure": string | null,
  "communication_preferences": {
    "primary_channel": string,
    "check_in_cadence": string | null,
    "stakeholders": [string]
  } | null,
  "assumptions": [string] | null,
  "constraints": [string] | null,
  "red_flags": [string] | null,
  "confidence_level": "high" | "medium" | "low"
}

If information is not mentioned or unclear, use null for that field. Be accurate and conservative.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the text content from the response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in Claude response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // Validate and construct the ScopingData object
    const scopingData: ScopingData = {
      client_info: {
        name: extractedData.client_info?.name || 'Unknown',
        contact_email: extractedData.client_info?.contact_email || undefined,
        contact_phone: extractedData.client_info?.contact_phone || undefined,
        company: extractedData.client_info?.company || undefined,
        decision_maker: extractedData.client_info?.decision_maker || undefined,
      },
      project_name: extractedData.project_name || 'Untitled Project',
      project_type: extractedData.project_type || 'General',
      project_description: extractedData.project_description || undefined,

      budget: {
        min: extractedData.budget?.min || 0,
        max: extractedData.budget?.max || 0,
        currency: extractedData.budget?.currency || 'USD',
      },

      timeline: {
        start_date: extractedData.timeline?.start_date || undefined,
        deadline: extractedData.timeline?.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimated_duration_days: extractedData.timeline?.estimated_duration_days || 30,
      },

      deliverables: (extractedData.deliverables || []).map((d: any) => ({
        name: d.name || 'Untitled Deliverable',
        description: d.description || '',
        format: d.format || undefined,
        specifications: d.specifications || undefined,
        approvals_required: d.approvals_required || undefined,
      })),

      revision_expectations: {
        revision_rounds: extractedData.revision_expectations?.revision_rounds || undefined,
        unlimited_revisions: extractedData.revision_expectations?.unlimited_revisions || undefined,
        scope_change_handling: extractedData.revision_expectations?.scope_change_handling || 'undefined',
        revision_policy: extractedData.revision_expectations?.revision_policy || undefined,
      },

      technical_requirements: extractedData.technical_requirements || undefined,
      team_structure: extractedData.team_structure || undefined,
      communication_preferences: extractedData.communication_preferences || undefined,

      assumptions: extractedData.assumptions || undefined,
      constraints: extractedData.constraints || undefined,
      red_flags: extractedData.red_flags || undefined,

      confidence_level: extractedData.confidence_level || 'low',
      extracted_at: new Date(),
    };

    return scopingData;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API') || error.message.includes('authentication')) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
    throw new Error('Failed to analyze transcript: Unknown error');
  }
}

/**
 * Generates a markdown summary of extracted scoping data
 * Useful for displaying results or creating documentation
 *
 * @param data The scoping data to summarize
 * @returns Formatted markdown string
 */
export function formatScopingDataAsMarkdown(data: ScopingData): string {
  const lines: string[] = [];

  lines.push(`# ${data.project_name} - Scoping Summary`);
  lines.push('');

  // Client Info
  lines.push('## Client Information');
  lines.push(`- **Name**: ${data.client_info.name}`);
  if (data.client_info.company) lines.push(`- **Company**: ${data.client_info.company}`);
  if (data.client_info.contact_email) lines.push(`- **Email**: ${data.client_info.contact_email}`);
  if (data.client_info.contact_phone) lines.push(`- **Phone**: ${data.client_info.contact_phone}`);
  if (data.client_info.decision_maker) lines.push(`- **Decision Maker**: ${data.client_info.decision_maker}`);
  lines.push('');

  // Project Overview
  lines.push('## Project Overview');
  lines.push(`- **Type**: ${data.project_type}`);
  if (data.project_description) lines.push(`- **Description**: ${data.project_description}`);
  lines.push('');

  // Budget
  lines.push('## Budget');
  lines.push(`- **Range**: ${data.budget.currency} ${data.budget.min.toLocaleString()} - ${data.budget.max.toLocaleString()}`);
  lines.push('');

  // Timeline
  lines.push('## Timeline');
  if (data.timeline.start_date) lines.push(`- **Start**: ${data.timeline.start_date}`);
  lines.push(`- **Deadline**: ${data.timeline.deadline}`);
  lines.push(`- **Estimated Duration**: ${data.timeline.estimated_duration_days} days`);
  lines.push('');

  // Deliverables
  lines.push('## Deliverables');
  for (const deliv of data.deliverables) {
    lines.push(`- **${deliv.name}**: ${deliv.description}`);
    if (deliv.format) lines.push(`  - Format: ${deliv.format}`);
    if (deliv.specifications) {
      lines.push(`  - Specifications:`);
      for (const [key, value] of Object.entries(deliv.specifications)) {
        lines.push(`    - ${key}: ${value}`);
      }
    }
  }
  lines.push('');

  // Revisions
  lines.push('## Revision & Approval Process');
  if (data.revision_expectations.revision_rounds)
    lines.push(`- **Revision Rounds**: ${data.revision_expectations.revision_rounds}`);
  if (data.revision_expectations.unlimited_revisions) lines.push('- **Unlimited Revisions**: Yes');
  lines.push(`- **Scope Changes**: ${data.revision_expectations.scope_change_handling}`);
  if (data.revision_expectations.revision_policy)
    lines.push(`- **Policy**: ${data.revision_expectations.revision_policy}`);
  lines.push('');

  // Communication
  if (data.communication_preferences) {
    lines.push('## Communication');
    lines.push(`- **Primary Channel**: ${data.communication_preferences.primary_channel}`);
    if (data.communication_preferences.check_in_cadence)
      lines.push(`- **Check-in Cadence**: ${data.communication_preferences.check_in_cadence}`);
    lines.push(`- **Stakeholders**: ${data.communication_preferences.stakeholders.join(', ')}`);
    lines.push('');
  }

  // Assumptions & Constraints
  if (data.assumptions && data.assumptions.length > 0) {
    lines.push('## Assumptions');
    for (const assumption of data.assumptions) {
      lines.push(`- ${assumption}`);
    }
    lines.push('');
  }

  if (data.constraints && data.constraints.length > 0) {
    lines.push('## Constraints');
    for (const constraint of data.constraints) {
      lines.push(`- ${constraint}`);
    }
    lines.push('');
  }

  // Red Flags
  if (data.red_flags && data.red_flags.length > 0) {
    lines.push('## ⚠️ Red Flags');
    for (const flag of data.red_flags) {
      lines.push(`- ${flag}`);
    }
    lines.push('');
  }

  // Confidence
  lines.push(`## Extraction Confidence: ${data.confidence_level.toUpperCase()}`);

  return lines.join('\n');
}
