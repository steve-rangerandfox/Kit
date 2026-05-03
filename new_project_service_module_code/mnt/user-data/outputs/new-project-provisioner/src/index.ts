// src/index.ts
// Azure Function v4 HTTP trigger — receives Bot Framework activity payloads

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Request, Response } from 'botbuilder';
import { createAdapter, ProjectProvisionerBot } from './bot/bot';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

// Singleton adapter and bot — cold starts only
const adapter = createAdapter();
const bot     = new ProjectProvisionerBot(adapter);

/**
 * Main Azure Function handler. All Teams bot traffic arrives here.
 */
async function messagesHandler(
  req: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  logger.debug('Incoming request', { method: req.method, url: req.url });

  try {
    // Adapt Azure Function request to Bot Framework's expected shape
    const body = await req.json();

    const botRequest: Request = {
      body,
      headers: Object.fromEntries(req.headers.entries()),
    } as unknown as Request;

    let statusCode = 200;
    const botResponse: Response = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send() { return this; },
      end() { return this; },
    } as unknown as Response;

    await adapter.processActivity(botRequest, botResponse, async (context) => {
      await bot.run(context);
    });

    return { status: statusCode };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Function handler error', { message });
    return { status: 500, body: JSON.stringify({ error: message }) };
  }
}

app.http('messages', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'messages',
  handler: messagesHandler,
});

export default messagesHandler;
