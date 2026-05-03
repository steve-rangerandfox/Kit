// src/bot/bot.ts

import {
  ActivityHandler,
  BotFrameworkAdapter,
  TurnContext,
  CardFactory,
  MessageFactory,
  ConversationReference,
} from 'botbuilder';
import { ProjectIntakeForm, OrchestratorContext, ServiceKey, ALL_SERVICES } from '../orchestrator/types';
import { runOrchestrator } from '../orchestrator';
import { buildSummaryCard } from './summaryCard';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const adaptiveCardSchema = require('./adaptiveCard.json');

export class ProjectProvisionerBot extends ActivityHandler {
  private adapter: BotFrameworkAdapter;

  constructor(adapter: BotFrameworkAdapter) {
    super();
    this.adapter = adapter;

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded ?? [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            "👋 Hi! I'm the **Project Provisioner** bot. Type `/newproject` to kick off provisioning."
          );
        }
      }
      await next();
    });
  }

  private async handleMessage(context: TurnContext): Promise<void> {
    const text = (context.activity.text ?? '').trim().toLowerCase();

    if (context.activity.value?.action === 'provisionProject') {
      await this.handleFormSubmit(context);
      return;
    }

    if (text.includes('/newproject') || text.includes('new project')) {
      await this.sendIntakeCard(context);
    } else {
      await context.sendActivity(
        "Type `/newproject` or say **new project** to open the project intake form."
      );
    }
  }

  private async sendIntakeCard(context: TurnContext): Promise<void> {
    const card = CardFactory.adaptiveCard(adaptiveCardSchema);
    await context.sendActivity(MessageFactory.attachment(card));
  }

  private async handleFormSubmit(context: TurnContext): Promise<void> {
    const value = context.activity.value as Record<string, string>;

    const form = this.parseFormData(value);
    const validationError = this.validateForm(form);
    if (validationError) {
      await context.sendActivity(`❌ **Validation error:** ${validationError}`);
      return;
    }

    // Build a readable list of selected services for the ack message
    const serviceLabels: Record<ServiceKey, string> = {
      dropbox:  '📦 Dropbox',
      frameio:  '🎬 Frame.io',
      canva:    '🎨 Canva',
      onedrive: '💾 OneDrive',
      clockify: '⏱ Clockify',
      figma:    '📐 FigJam',
      notion:   '📓 Notion',
      teams:    '💬 Teams Chat',
    };
    const selectedLabels = form.selectedServices.map((k) => serviceLabels[k]).join(', ');

    await context.sendActivity(
      `🚀 Got it! Provisioning **${form.projectName}** for **${form.clientName}**.\n\n` +
      `**Creating:** ${selectedLabels}`
    );

    const conversationRef = TurnContext.getConversationReference(context.activity);
    const serviceUrl = context.activity.serviceUrl;
    const tenantId = (context.activity.channelData as Record<string, string>)?.tenant?.id ?? '';

    const orchestratorCtx: OrchestratorContext = {
      form,
      conversationId: conversationRef.conversation?.id ?? '',
      serviceUrl,
      tenantId,
    };

    this.runProvisioningAsync(orchestratorCtx, conversationRef).catch((err) =>
      logger.error('Unhandled orchestration error', { err })
    );
  }

  private async runProvisioningAsync(
    ctx: OrchestratorContext,
    conversationRef: Partial<ConversationReference>
  ): Promise<void> {
    const sendProgress = async (_phase: string, message: string): Promise<void> => {
      try {
        await this.adapter.continueConversation(
          conversationRef as ConversationReference,
          async (context: TurnContext) => { await context.sendActivity(message); }
        );
      } catch (err) {
        logger.warn('Failed to send progress message', { err });
      }
    };

    try {
      const results = await runOrchestrator(ctx, sendProgress);

      const summaryCard = buildSummaryCard(ctx.form, results);
      await this.adapter.continueConversation(
        conversationRef as ConversationReference,
        async (context: TurnContext) => {
          const card = CardFactory.adaptiveCard(summaryCard);
          await context.sendActivity(MessageFactory.attachment(card));
        }
      );
    } catch (err) {
      logger.error('Orchestration failed', { err });
      const message = err instanceof Error ? err.message : String(err);
      await this.adapter.continueConversation(
        conversationRef as ConversationReference,
        async (context: TurnContext) => {
          await context.sendActivity(
            `❌ **Provisioning failed unexpectedly:** ${message}\n\nPlease check the logs and retry.`
          );
        }
      );
    }
  }

  private parseFormData(value: Record<string, string>): ProjectIntakeForm {
    const rawMembers = value.teamMembers ?? '';
    const teamMembers = rawMembers
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    // Parse the svc_* toggles. Adaptive Card sends "true"/"false" strings.
    // Any service whose toggle is absent or "false" is excluded.
    const SERVICE_KEYS: ServiceKey[] = ['dropbox', 'frameio', 'canva', 'onedrive', 'clockify', 'figma', 'notion', 'teams'];
    const selectedServices: ServiceKey[] = SERVICE_KEYS.filter(
      (key) => value[`svc_${key}`] === 'true'
    );

    return {
      projectName:       value.projectName?.trim() ?? '',
      clientName:        value.clientName?.trim() ?? '',
      projectType:       (value.projectType as ProjectIntakeForm['projectType']) ?? 'Other',
      projectManager:    value.projectManager?.trim() ?? '',
      teamMembers,
      startDate:         value.startDate || undefined,
      deadline:          value.deadline || undefined,
      description:       value.description?.trim() || undefined,
      // Fall back to ALL_SERVICES if somehow no toggles were submitted
      selectedServices:  selectedServices.length > 0 ? selectedServices : ALL_SERVICES,
    };
  }

  private validateForm(form: ProjectIntakeForm): string | null {
    if (!form.projectName)    return 'Project name is required.';
    if (!form.clientName)     return 'Client name is required.';
    if (!form.projectManager) return 'Project manager is required.';
    if (form.selectedServices.length === 0) return 'Please select at least one service to provision.';
    return null;
  }
}

export function createAdapter(): BotFrameworkAdapter {
  const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  });

  adapter.onTurnError = async (context: TurnContext, error: Error) => {
    logger.error('Unhandled bot turn error', { error: error.message, stack: error.stack });
    await context.sendActivity('⚠️ An unexpected error occurred. Please try again.');
  };

  return adapter;
}
