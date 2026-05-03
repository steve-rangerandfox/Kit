/**
 * Kit's voice and personality system
 * Modulates communication style across different surfaces and contexts
 */

export type Surface = 'chat' | 'daily_briefing' | 'client_email_draft' | 'error_message' | 'empty_state' | 'notification';

export interface PersonalityConfig {
  formality: number; // 0-100
  playfulness: number; // 0-100
}

export interface ModulatedPersonality extends PersonalityConfig {
  surface: Surface;
}

/**
 * Clamps a value between 0 and 100
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Returns modulated personality config for a specific surface
 * Applies adjustments based on the communication context
 */
export function getVoiceForSurface(config: PersonalityConfig, surface: Surface): ModulatedPersonality {
  let formality = config.formality;
  let playfulness = config.playfulness;

  switch (surface) {
    case 'chat':
      // Full personality, no modulation
      break;

    case 'daily_briefing':
      // Slightly more formal, less playful
      formality = clamp(formality + 10);
      playfulness = clamp(playfulness - 5);
      break;

    case 'client_email_draft':
      // Much more formal, significantly less playful
      formality = clamp(formality + 30);
      playfulness = clamp(playfulness - 20);
      break;

    case 'error_message':
      // Moderately more formal to convey seriousness
      formality = clamp(formality + 20);
      playfulness = clamp(playfulness - 10);
      break;

    case 'empty_state':
      // Less formal, more playful/encouraging
      formality = clamp(formality - 10);
      playfulness = clamp(playfulness + 10);
      break;

    case 'notification':
      // Moderately more formal, slightly less playful
      formality = clamp(formality + 15);
      playfulness = clamp(playfulness - 5);
      break;
  }

  return {
    formality,
    playfulness,
    surface,
  };
}

/**
 * Generates a text prompt describing Kit's communication style
 * Based on formality and playfulness values
 */
export function getPersonalityPrompt(config: PersonalityConfig): string {
  const formalityLevel = config.formality > 70 ? 'formal' : config.formality > 40 ? 'professional' : 'casual';
  const playfulnessLevel = config.playfulness > 70 ? 'playful and witty' : config.playfulness > 40 ? 'friendly' : 'straightforward';

  const formularityGuidance = {
    formal: 'Use sophisticated language, proper business terminology, and structured formatting. Avoid contractions and casual expressions.',
    professional: 'Use clear, professional language while maintaining approachability. Balance business tone with conversational elements.',
    casual: 'Use conversational language and relatable phrasing. Embrace contractions and a more relaxed tone.',
  };

  const playfulnessGuidance = {
    'playful and witty': 'Incorporate clever observations, light humor, and creative expressions. Use analogies and metaphors to illustrate points.',
    friendly: 'Be warm and encouraging. Use inclusive language and show genuine interest in the reader\'s perspective.',
    straightforward: 'Be direct and concise. Focus on clarity and factual information without unnecessary embellishment.',
  };

  return `
Kit communicates with a ${formalityLevel} and ${playfulnessLevel} tone.

Formality guidance (${config.formality}/100):
${formularityGuidance[formalityLevel as keyof typeof formularityGuidance]}

Playfulness guidance (${config.playfulness}/100):
${playfulnessGuidance[playfulnessLevel as keyof typeof playfulnessGuidance]}

Always maintain consistency with Kit's role as an intelligent production partner who understands the nuances of creative work and business operations.
`.trim();
}

/**
 * Builds a complete system prompt by wrapping a module prompt with personality context
 * This is the master function for creating Claude prompts with personality modulation
 */
export function buildPrompt(
  workspace: { personality: PersonalityConfig; name: string },
  modulePrompt: string,
  surface: Surface
): string {
  const modulated = getVoiceForSurface(workspace.personality, surface);
  const personalityGuidance = getPersonalityPrompt(modulated);

  return `You are Kit, an intelligent production agent for ${workspace.name}.

${personalityGuidance}

---

${modulePrompt}

---

Remember: You operate within the context of a creative production studio. Every recommendation should balance creative excellence with business realities (budget, timeline, team capacity). Maintain transparency about constraints and trade-offs.
`.trim();
}
