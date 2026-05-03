/**
 * Slack Task Card Blocks
 *
 * Builds Block Kit representations of TaskCards for different stages:
 * - Producer/CD review before distribution
 * - Artist morning briefing
 * - EOD check-in
 *
 * @module slack/task-card-blocks
 */

// Type declarations
type SlackClient = any;
type SlackInteractionPayload = any;

/**
 * Task card data structure
 */
interface TaskCard {
  id: string;
  project_id: string;
  date: string;
  tasks: Task[];
  created_by_id: string;
  status: 'draft' | 'pending_review' | 'distributed' | 'completed';
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to_id: string;
  estimated_hours?: number;
  context?: string;
}

/**
 * Build task card for producer/CD review
 *
 * Shows complete task card with all tasks, allowing producer to:
 * - Approve and distribute to team
 * - Edit tasks before distribution
 * - Skip certain tasks
 *
 * @param card - Task card data
 * @param producer - Producer/CD reviewing
 * @returns Array of Block Kit blocks
 */
export function buildTaskCardReview(
  card: TaskCard,
  producer: {
    id: string;
    name: string;
  }
): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 Task Card Review',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Review the task card for *${new Date(card.date).toLocaleDateString()}* before distributing to the team.`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // List all tasks
  card.tasks.forEach((task, index) => {
    const priorityEmoji = getPriorityEmoji(task.priority);
    const timeEst = task.estimated_hours
      ? `⏱️ ${task.estimated_hours}h`
      : '';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${priorityEmoji} *${task.title}*\n${task.description || 'No description'}${timeEst ? '\n' + timeEst : ''}`,
      },
    });

    // Add context if available
    if (task.context) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Context: ${task.context}`,
          },
        ],
      });
    }
  });

  blocks.push({
    type: 'divider',
  });

  // Action buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Approve & Distribute',
          emoji: true,
        },
        style: 'primary',
        action_id: `taskcard_approve_${card.id}`,
        value: card.id,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Edit Tasks',
        },
        action_id: `taskcard_edit_${card.id}`,
        value: card.id,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Skip',
        },
        action_id: `taskcard_skip_${card.id}`,
        value: card.id,
      },
    ],
  });

  return blocks;
}

/**
 * Build task card for artist morning briefing
 *
 * Sent to each team member in their DM.
 * Shows:
 * - Day's priority tasks
 * - Context for each task
 * - Time allocations
 * - "Acknowledge" button to confirm receipt
 *
 * @param card - Task card data
 * @returns Array of Block Kit blocks
 */
export function buildTaskCardDistribution(card: TaskCard): any[] {
  const date = new Date(card.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📅 Your Plan for ${dayName}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Here's your task plan for *${date.toLocaleDateString()}*. Let me know if you have questions!`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Sort tasks by priority (high -> low)
  const sortedTasks = [...card.tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // List tasks
  sortedTasks.forEach((task) => {
    const priorityEmoji = getPriorityEmoji(task.priority);
    const timeEst = task.estimated_hours
      ? `• ⏱️ ${task.estimated_hours}h`
      : '';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${priorityEmoji} *${task.title}*${timeEst}`,
      },
    });

    if (task.context) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: task.context,
          },
        ],
      });
    }
  });

  blocks.push({
    type: 'divider',
  });

  // Total time estimate
  const totalHours = card.tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  if (totalHours > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Total Estimated Time:* ${totalHours} hours`,
      },
    });
  }

  // Acknowledge button
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Got it! 👍',
          emoji: true,
        },
        style: 'primary',
        action_id: `taskcard_acknowledge_${card.id}`,
        value: card.id,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Questions?',
        },
        action_id: `taskcard_questions_${card.id}`,
        value: card.id,
      },
    ],
  });

  return blocks;
}

/**
 * Build EOD check-in blocks
 *
 * Sent at end of day to same team member.
 * Shows:
 * - Reference to morning's card
 * - Quick completion toggles for each task
 * - Time entry buttons for tracking
 * - Reflection section
 *
 * @param card - Task card data
 * @returns Array of Block Kit blocks
 */
export function buildEODCheckin(card: TaskCard): any[] {
  const date = new Date(card.date);

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: "🌅 End of Day Check-In",
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `How did today go? Here's what was on your plan for *${date.toLocaleDateString()}*.`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Task completion checklist
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Task Completion*',
    },
  });

  card.tasks.forEach((task) => {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${task.title}`,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '✓ Done',
        },
        action_id: `taskcard_eod_toggle_${card.id}_${task.id}`,
        value: 'complete',
      },
    });
  });

  blocks.push({
    type: 'divider',
  });

  // Time entry
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Time Tracking*\nHow much time did you spend today?',
    },
  });

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '4 hrs',
        },
        action_id: `taskcard_eod_hours_${card.id}_4`,
        value: '4',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '6 hrs',
        },
        action_id: `taskcard_eod_hours_${card.id}_6`,
        value: '6',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '8 hrs',
        },
        action_id: `taskcard_eod_hours_${card.id}_8`,
        value: '8',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '10+ hrs',
        },
        action_id: `taskcard_eod_hours_${card.id}_10`,
        value: '10',
      },
    ],
  });

  blocks.push({
    type: 'divider',
  });

  // Reflection
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Any blockers or notes?*',
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Add Note',
      },
      action_id: `taskcard_eod_note_${card.id}`,
      value: card.id,
    },
  });

  return blocks;
}

/**
 * Handle task card actions
 *
 * @param payload - Slack interaction payload
 */
export async function handleTaskCardAction(
  payload: SlackInteractionPayload
): Promise<void> {
  const { actions, team_id, user } = payload;

  try {
    const action = actions[0];
    const actionId = action.action_id;

    if (actionId.includes('approve')) {
      // Approve and distribute card
      console.log('Approving task card:', { actionId, user: user.id });
    } else if (actionId.includes('acknowledge')) {
      // User acknowledged the morning brief
      console.log('Task card acknowledged:', { actionId, user: user.id });
    } else if (actionId.includes('eod_toggle')) {
      // Toggle task completion
      console.log('Task toggled:', { actionId, value: action.value });
    } else if (actionId.includes('eod_hours')) {
      // Log time entry
      console.log('Time logged:', { actionId, hours: action.value });
    } else if (actionId.includes('eod_note')) {
      // Open modal for note
      console.log('Note modal would open:', { actionId });
    }
  } catch (error) {
    console.error('Error handling task card action:', error);
  }
}

/**
 * Get emoji for task priority
 */
function getPriorityEmoji(priority: string): string {
  const emojiMap: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  };
  return emojiMap[priority] || '⚪';
}
