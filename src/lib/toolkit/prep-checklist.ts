/**
 * Call preparation checklists for Kit toolkit
 * Provides structured checklists for different call types with project-specific context
 */

export type CallType = 'scoping_call' | 'kickoff' | 'client_review' | 'status_checkin';

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  category: string;
}

export interface Checklist {
  id: string;
  callType: CallType;
  title: string;
  description: string;
  items: ChecklistItem[];
  generatedAt: Date;
}

export interface ProjectContext {
  projectId: string;
  projectName?: string;
  clientName?: string;
  status?: string;
  budget?: number;
  deadline?: Date;
  teamSize?: number;
  deliverableCount?: number;
}

/**
 * Default scoping call checklist
 * Used for initial project scoping conversations
 */
function getScopingCallChecklist(projectContext?: ProjectContext): Checklist {
  const items: ChecklistItem[] = [
    // Project Goals
    {
      id: 'scoping-goals-1',
      label: 'Clarify project goals and success metrics',
      description: 'Ensure alignment on what success looks like for this project',
      required: true,
      category: 'Project Goals',
    },
    {
      id: 'scoping-goals-2',
      label: 'Discuss key stakeholders and decision makers',
      required: true,
      category: 'Project Goals',
    },

    // Budget
    {
      id: 'scoping-budget-1',
      label: 'Establish budget range and constraints',
      description: 'Discuss budget limits, payment terms, contingency expectations',
      required: true,
      category: 'Budget',
    },
    {
      id: 'scoping-budget-2',
      label: 'Identify what can/cannot be done at different budget levels',
      required: false,
      category: 'Budget',
    },

    // Timeline
    {
      id: 'scoping-timeline-1',
      label: 'Confirm project timeline and deadline',
      description: 'Verify hard deadline and any interim milestones',
      required: true,
      category: 'Timeline',
    },
    {
      id: 'scoping-timeline-2',
      label: 'Discuss dependencies and approval process timeline',
      required: true,
      category: 'Timeline',
    },

    // Team & Roles
    {
      id: 'scoping-team-1',
      label: 'Introduce your team and lead producer',
      description: 'Share bios, relevant experience, and roles',
      required: true,
      category: 'Team',
    },
    {
      id: 'scoping-team-2',
      label: 'Understand client team structure and key contacts',
      required: true,
      category: 'Team',
    },

    // Deliverables
    {
      id: 'scoping-deliv-1',
      label: 'Define all deliverables and specifications',
      description: 'Video duration, design files, formats, quality standards, etc.',
      required: true,
      category: 'Deliverables',
    },
    {
      id: 'scoping-deliv-2',
      label: 'Clarify revision limits and approval process',
      description: 'How many rounds of revisions? Who approves? What happens at impasse?',
      required: true,
      category: 'Deliverables',
    },

    // Process
    {
      id: 'scoping-process-1',
      label: 'Establish communication preferences and check-in cadence',
      description: 'Email, Slack, Zoom? Daily standups? Weekly syncs?',
      required: true,
      category: 'Process',
    },
    {
      id: 'scoping-process-2',
      label: 'Discuss how feedback will be collected and consolidated',
      required: true,
      category: 'Process',
    },
    {
      id: 'scoping-process-3',
      label: 'Set expectations for response times and deliverable reviews',
      required: false,
      category: 'Process',
    },
  ];

  // Inject project-specific items if context provided
  if (projectContext) {
    if (projectContext.clientName) {
      items.push({
        id: 'scoping-custom-1',
        label: `Discuss ${projectContext.clientName}'s brand guidelines and preferences`,
        required: false,
        category: 'Custom',
      });
    }
    if (projectContext.deliverableCount) {
      items.push({
        id: 'scoping-custom-2',
        label: `Confirm all ${projectContext.deliverableCount} deliverables and delivery order`,
        required: true,
        category: 'Custom',
      });
    }
  }

  return {
    id: 'checklist-scoping',
    callType: 'scoping_call',
    title: 'Scoping Call Preparation',
    description: 'Comprehensive checklist for initial project scoping conversation',
    items,
    generatedAt: new Date(),
  };
}

/**
 * Default kickoff call checklist
 * Used when project officially kicks off with approved scope
 */
function getKickoffChecklist(projectContext?: ProjectContext): Checklist {
  const items: ChecklistItem[] = [
    // Scope Confirmation
    {
      id: 'kickoff-scope-1',
      label: 'Review and confirm project scope statement',
      description: 'Walk through the SOW or signed agreement together',
      required: true,
      category: 'Scope',
    },
    {
      id: 'kickoff-scope-2',
      label: 'Clarify what is explicitly out of scope',
      required: true,
      category: 'Scope',
    },

    // Team Introductions
    {
      id: 'kickoff-team-1',
      label: 'Introduce full project team with role descriptions',
      description: 'Lead producer, creative, technical, project manager, etc.',
      required: true,
      category: 'Team',
    },
    {
      id: 'kickoff-team-2',
      label: 'Share contact information for each team member',
      required: true,
      category: 'Team',
    },
    {
      id: 'kickoff-team-3',
      label: 'Establish escalation path for issues',
      required: true,
      category: 'Team',
    },

    // Timeline & Milestones
    {
      id: 'kickoff-timeline-1',
      label: 'Walk through detailed project timeline and milestones',
      description: 'Present the workback schedule with dates and deliverables',
      required: true,
      category: 'Timeline',
    },
    {
      id: 'kickoff-timeline-2',
      label: 'Highlight critical milestones and dependencies',
      required: true,
      category: 'Timeline',
    },
    {
      id: 'kickoff-timeline-3',
      label: 'Discuss buffer time and contingency plans',
      required: false,
      category: 'Timeline',
    },

    // Feedback Process
    {
      id: 'kickoff-feedback-1',
      label: 'Walk through the feedback and revision process',
      description: 'How will feedback be submitted? How consolidated? Response times?',
      required: true,
      category: 'Feedback',
    },
    {
      id: 'kickoff-feedback-2',
      label: 'Establish revision limits per deliverable',
      required: true,
      category: 'Feedback',
    },

    // Check-in Cadence
    {
      id: 'kickoff-checkin-1',
      label: 'Confirm regular check-in schedule',
      description: 'Weekly status meetings, biweekly reviews, etc.',
      required: true,
      category: 'Communication',
    },
    {
      id: 'kickoff-checkin-2',
      label: 'Set expectations for async updates and communication',
      required: true,
      category: 'Communication',
    },

    // Tools & Access
    {
      id: 'kickoff-tools-1',
      label: 'Distribute access to shared tools and platforms',
      description: 'Project management, file sharing, feedback tools, etc.',
      required: true,
      category: 'Tools',
    },
    {
      id: 'kickoff-tools-2',
      label: 'Confirm preferred communication channels',
      required: true,
      category: 'Tools',
    },
  ];

  // Inject project-specific items
  if (projectContext?.teamSize) {
    items.push({
      id: 'kickoff-custom-1',
      label: `Coordinate with ${projectContext.teamSize} team members on availability`,
      required: true,
      category: 'Custom',
    });
  }

  if (projectContext?.deadline) {
    items.push({
      id: 'kickoff-custom-2',
      label: `Confirm final delivery date: ${projectContext.deadline.toLocaleDateString()}`,
      required: true,
      category: 'Custom',
    });
  }

  return {
    id: 'checklist-kickoff',
    callType: 'kickoff',
    title: 'Project Kickoff Preparation',
    description: 'Checklist for official project kickoff meeting',
    items,
    generatedAt: new Date(),
  };
}

/**
 * Default client review checklist
 * Used for milestone/deliverable review calls
 */
function getClientReviewChecklist(projectContext?: ProjectContext): Checklist {
  const items: ChecklistItem[] = [
    // Preparation
    {
      id: 'review-prep-1',
      label: 'Gather all assets and deliverables to present',
      required: true,
      category: 'Preparation',
    },
    {
      id: 'review-prep-2',
      label: 'Organize files in clear, logical order',
      description: 'Ensure easy navigation during the call',
      required: true,
      category: 'Preparation',
    },
    {
      id: 'review-prep-3',
      label: 'Test all video playback, links, and interactive elements',
      required: true,
      category: 'Preparation',
    },

    // Context
    {
      id: 'review-context-1',
      label: 'Prepare context on changes made since last review',
      description: 'Document feedback addressed and decisions made',
      required: true,
      category: 'Context',
    },
    {
      id: 'review-context-2',
      label: 'Create list of discussion points and decisions needed',
      required: true,
      category: 'Context',
    },

    // Revision Tracking
    {
      id: 'review-revision-1',
      label: 'Prepare revision tracker showing all feedback and status',
      description: 'Address/pending/approved items clearly marked',
      required: true,
      category: 'Tracking',
    },
    {
      id: 'review-revision-2',
      label: 'Have alternative versions ready if applicable',
      description: 'Different edits, color grades, music options, etc.',
      required: false,
      category: 'Tracking',
    },

    // Status Updates
    {
      id: 'review-status-1',
      label: 'Prepare budget status update',
      description: 'Spent to date, projected final, any overages',
      required: true,
      category: 'Status',
    },
    {
      id: 'review-status-2',
      label: 'Prepare timeline status update',
      description: 'Milestones completed, upcoming dates, any risks',
      required: true,
      category: 'Status',
    },
    {
      id: 'review-status-3',
      label: 'Highlight any risks or blockers impacting delivery',
      required: true,
      category: 'Status',
    },

    // Next Steps
    {
      id: 'review-next-1',
      label: 'Prepare next steps and timeline for revisions',
      description: 'When will changes be made? When next review?',
      required: true,
      category: 'Planning',
    },
    {
      id: 'review-next-2',
      label: 'Clarify what decisions are needed from client',
      required: true,
      category: 'Planning',
    },
  ];

  if (projectContext?.deliverableCount) {
    items.push({
      id: 'review-custom-1',
      label: `Prepare presentation of ${projectContext.deliverableCount} deliverables in priority order`,
      required: true,
      category: 'Custom',
    });
  }

  return {
    id: 'checklist-review',
    callType: 'client_review',
    title: 'Client Review Call Preparation',
    description: 'Checklist for milestone or deliverable review meeting',
    items,
    generatedAt: new Date(),
  };
}

/**
 * Default status check-in checklist
 * Used for ongoing project status updates
 */
function getStatusCheckInChecklist(projectContext?: ProjectContext): Checklist {
  const items: ChecklistItem[] = [
    // Progress Update
    {
      id: 'checkin-progress-1',
      label: 'Prepare milestone progress summary',
      description: 'Completed, in progress, upcoming milestones',
      required: true,
      category: 'Progress',
    },
    {
      id: 'checkin-progress-2',
      label: 'Document percentage complete for each workstream',
      required: true,
      category: 'Progress',
    },

    // Blockers & Issues
    {
      id: 'checkin-blockers-1',
      label: 'List any blockers or issues impacting progress',
      description: 'Be specific about what, why, and impact',
      required: true,
      category: 'Issues',
    },
    {
      id: 'checkin-blockers-2',
      label: 'Prepare proposed solutions for each blocker',
      required: true,
      category: 'Issues',
    },

    // Upcoming Deliverables
    {
      id: 'checkin-upcoming-1',
      label: 'Preview upcoming deliverables in next 2 weeks',
      required: true,
      category: 'Deliverables',
    },
    {
      id: 'checkin-upcoming-2',
      label: 'Highlight any deliverables at risk or behind schedule',
      required: true,
      category: 'Deliverables',
    },

    // Budget Status
    {
      id: 'checkin-budget-1',
      label: 'Prepare budget status update',
      description: 'Spent to date, velocity, projected final',
      required: true,
      category: 'Budget',
    },
    {
      id: 'checkin-budget-2',
      label: 'Flag any budget concerns or overages',
      required: true,
      category: 'Budget',
    },

    // Feedback Summary
    {
      id: 'checkin-feedback-1',
      label: 'Summarize all open feedback and status',
      description: 'Addressed, pending, approved items',
      required: true,
      category: 'Feedback',
    },
    {
      id: 'checkin-feedback-2',
      label: 'Discuss any feedback themes or patterns',
      required: false,
      category: 'Feedback',
    },

    // Team Updates
    {
      id: 'checkin-team-1',
      label: 'Note any team changes or capacity impacts',
      required: false,
      category: 'Team',
    },
    {
      id: 'checkin-team-2',
      label: 'Highlight team wins and accomplishments',
      required: false,
      category: 'Team',
    },

    // Decisions Needed
    {
      id: 'checkin-decisions-1',
      label: 'List any decisions needed from client this week',
      required: true,
      category: 'Decisions',
    },
  ];

  if (projectContext?.status) {
    items.push({
      id: 'checkin-custom-1',
      label: `Update on current phase: ${projectContext.status}`,
      required: true,
      category: 'Custom',
    });
  }

  return {
    id: 'checklist-checkin',
    callType: 'status_checkin',
    title: 'Status Check-In Preparation',
    description: 'Checklist for ongoing project status update meeting',
    items,
    generatedAt: new Date(),
  };
}

/**
 * Returns the appropriate checklist for the given call type
 * Injects project-specific context items when provided
 *
 * @param callType Type of call to prepare for
 * @param projectContext Optional project context for customization
 * @returns Populated checklist with call-specific and project-specific items
 */
export function getChecklist(callType: CallType, projectContext?: ProjectContext): Checklist {
  switch (callType) {
    case 'scoping_call':
      return getScopingCallChecklist(projectContext);
    case 'kickoff':
      return getKickoffChecklist(projectContext);
    case 'client_review':
      return getClientReviewChecklist(projectContext);
    case 'status_checkin':
      return getStatusCheckInChecklist(projectContext);
    default:
      throw new Error(`Unknown call type: ${callType}`);
  }
}
