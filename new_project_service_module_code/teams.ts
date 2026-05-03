// src/services/teams.ts

import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult, ProjectIntakeForm } from '../orchestrator/types';
import { getGraphToken } from './graphAuth';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Creates a group chat, adds all team members, and posts a welcome message.
 */
export async function provisionTeamsChat(
  form: ProjectIntakeForm,
  dryRun = false
): Promise<ServiceResult> {
  try {
    if (dryRun) {
      logger.info('[DRY RUN] Teams: would create group chat', {
        project: form.projectName,
        members: form.teamMembers,
      });
      return {
        service: 'Teams',
        success: true,
        url: 'https://teams.microsoft.com/l/chat/dry-run-id',
      };
    }

    const token = await getGraphToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Build member list for chat creation — requires user object IDs.
    // We resolve emails → IDs first.
    const allEmails = [...new Set([form.projectManager, ...form.teamMembers])].filter(Boolean);
    const memberIds = await resolveMemberIds(allEmails, token);

    // Step 1: create group chat
    const chatResponse = await withRetry(
      () =>
        axios.post(
          `${GRAPH_BASE}/chats`,
          {
            chatType: 'group',
            topic: `${form.projectName} — ${form.clientName}`,
            members: memberIds.map((id) => ({
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${id}')`,
            })),
          },
          { headers }
        ),
      { onRetry: (a, e) => logger.warn(`Teams chat create retry ${a}`, { error: e.message }) }
    );

    const chatId: string = chatResponse.data.id;
    logger.info('Teams: group chat created', { chatId });

    // Step 2: post welcome message
    const welcomeMessage = buildWelcomeMessage(form);
    await withRetry(
      () =>
        axios.post(
          `${GRAPH_BASE}/chats/${chatId}/messages`,
          {
            body: {
              contentType: 'html',
              content: welcomeMessage,
            },
          },
          { headers }
        ),
      { onRetry: (a, e) => logger.warn(`Teams welcome message retry ${a}`, { error: e.message }) }
    );

    logger.info('Teams: welcome message posted', { chatId });

    const url = `https://teams.microsoft.com/l/chat/${encodeURIComponent(chatId)}`;
    logger.serviceResult('Teams', true, url);
    return { service: 'Teams', success: true, url, id: chatId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('Teams', false, message);
    return { service: 'Teams', success: false, error: message };
  }
}

/** Resolves an array of email addresses to Microsoft Graph user IDs */
async function resolveMemberIds(emails: string[], token: string): Promise<string[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const ids: string[] = [];

  await Promise.allSettled(
    emails.map(async (email) => {
      try {
        const res = await axios.get(`${GRAPH_BASE}/users/${encodeURIComponent(email)}`, {
          headers,
          params: { $select: 'id' },
        });
        ids.push(res.data.id as string);
      } catch {
        logger.warn(`Teams: could not resolve user ID for ${email}`);
      }
    })
  );

  return ids;
}

function buildWelcomeMessage(form: ProjectIntakeForm): string {
  return `
    <p>👋 <strong>Welcome to the ${form.projectName} project chat!</strong></p>
    <p>
      <strong>Client:</strong> ${form.clientName}<br/>
      <strong>Type:</strong> ${form.projectType}<br/>
      <strong>PM:</strong> ${form.projectManager}<br/>
      ${form.startDate ? `<strong>Start:</strong> ${form.startDate}<br/>` : ''}
      ${form.deadline ? `<strong>Deadline:</strong> ${form.deadline}<br/>` : ''}
    </p>
    ${form.description ? `<p><em>${form.description}</em></p>` : ''}
    <p>📁 All project infrastructure is being set up — links will be posted shortly.</p>
  `.trim();
}
