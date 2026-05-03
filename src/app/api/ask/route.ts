import { NextRequest, NextResponse } from 'next/server'

export interface Source {
  title: string
  projectId?: string
  documentId?: string
  url?: string
}

export interface AskResponse {
  response: string
  sources: Source[]
  suggestedQuestions: string[]
}

export interface AskRequest {
  message: string
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

/**
 * POST /api/ask
 * Handles Ask Kit chat queries
 * For now returns mock responses; will be wired to actual RAG + Claude API later
 */
export async function POST(request: NextRequest) {
  try {
    const body: AskRequest = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Generate a mock response based on the message
    // TODO: Replace with actual Claude API call + RAG
    const mockResponse = generateMockResponse(message, conversationHistory)

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error('Ask Kit API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * Generates a mock response for development
 * This will be replaced with actual Claude API + RAG system
 */
function generateMockResponse(
  message: string,
  _conversationHistory: Array<{ role: string; content: string }>
): AskResponse {
  const lowerMessage = message.toLowerCase()

  // Mock responses based on question patterns
  if (
    lowerMessage.includes('status') ||
    lowerMessage.includes('active') ||
    lowerMessage.includes('projects')
  ) {
    return {
      response: `**Active Projects Summary**\n\nYou currently have 5 active projects in progress:\n\n1. **Nike Q2 Campaign** - In Production (65% complete)\n   Timeline: On track, delivery in 2 weeks\n   Budget: 12% over (trending toward mitigation)\n\n2. **Apple Product Launch** - Post-Production (80% complete)\n   Timeline: 3 days behind schedule on animation\n   Budget: Under budget by 8%\n\n3. **Coca-Cola Summer Campaign** - Pre-Production (30% complete)\n   Timeline: On track\n   Budget: On track, scope expansion request pending\n\n4. **Samsung Case Study** - In Review (95% complete)\n   Timeline: Complete, ready for presentation\n   Budget: Under budget\n\n5. **Mercedes Brand Refresh** - Design Phase (70% complete)\n   Timeline: On track\n   Budget: On track\n\nOverall health: 3 on track, 1 at risk, 1 complete. **2 actions require immediate attention.**`,
      sources: [
        { title: 'Nike Q2 Campaign', projectId: 'proj_nike_q2' },
        { title: 'Apple Product Launch', projectId: 'proj_apple_launch' },
        { title: 'Coca-Cola Summer Campaign', projectId: 'proj_cocacola' },
        { title: 'Samsung Case Study', projectId: 'proj_samsung' },
        { title: 'Mercedes Brand Refresh', projectId: 'proj_mercedes' },
      ],
      suggestedQuestions: [
        'What are the specific risks on the Apple project?',
        'How much is Nike over budget?',
        'Can we fit the Coca-Cola scope changes?',
      ],
    }
  }

  if (lowerMessage.includes('risk') || lowerMessage.includes('at risk')) {
    return {
      response: `**Projects at Risk**\n\nOne project currently has risk indicators:\n\n**Apple Product Launch**\n- Animation deliverable is 3 days behind schedule\n- Completion: 80% (original estimate was 85% by today)\n- Impact: Final delivery could slip by 3-5 days if not mitigated\n- Current mitigation: Parallel processing of post-production and color grading\n- Contingency used: 2 of 5 buffer days\n\n**Potential risks to monitor:**\n\n1. **Nike Q2 Campaign** - Budget trending over (already 12% over, still in production phase)\n2. **Coca-Cola** - Scope expansion request could impact timeline and budget\n\nRecommendation: Approve parallel processing for Apple and monitor Nike's spend velocity for the next 3 days.`,
      sources: [
        { title: 'Apple Product Launch - Risk Assessment', projectId: 'proj_apple_launch' },
      ],
      suggestedQuestions: [
        'What specific actions can we take to get Apple back on track?',
        'Should we approve the Nike cost mitigation strategy?',
      ],
    }
  }

  if (lowerMessage.includes('nike') || lowerMessage.includes('budget')) {
    return {
      response: `**Nike Q2 Campaign - Financial Status**\n\n**Current Spend: $145,000 of $130,000 budget**\n**Over by: $15,000 (12%)**\n\nSpend by category:\n- Production: $87,000 (on track)\n- Creative Direction: $32,000 (12% over)\n- Talent & Licensing: $18,000 (18% over)\n- Post-Production: $8,000 (projected, not yet spent)\n\n**Analysis:**\nYou're at 65% project completion with 100% of budget spent. This indicates uneven spend distribution. The talent & licensing category is notably over, suggesting either underbudgeted line items or scope changes.\n\n**Projected Final Cost:** $156,000-$165,000\n**Projected Overrun:** $26,000-$35,000 (20-27%)\n\n**Recommendations:**\n1. Review talent & licensing justifications\n2. Optimize remaining post-production work (currently budgeted at $8k, could reduce)\n3. Request client approval for overrun OR reduce scope`,
      sources: [
        { title: 'Nike Q2 Campaign Budget Report', projectId: 'proj_nike_q2' },
        { title: 'Cost Breakdown Q2', projectId: 'proj_nike_q2' },
      ],
      suggestedQuestions: [
        'Can we reduce post-production costs without affecting quality?',
        'Which team members should review the talent category?',
      ],
    }
  }

  if (lowerMessage.includes('health') || lowerMessage.includes('overall')) {
    return {
      response: `**Studio Health Assessment**\n\n**Overall Status: Healthy with Caution** 🟡\n\n**By the Numbers:**\n- Active Projects: 5\n- On Schedule: 3 projects\n- At Risk: 1 project (Apple)\n- Over Budget: 1 project (Nike)\n- Critical Actions: 2\n\n**Budget Health:**\n- Total Active Budget: $523,000\n- Total Spent to Date: $412,000 (79%)\n- Projected Overrun: -$26,000 to $35,000\n- Status: Requires monitoring\n\n**Timeline Health:**\n- 60% of milestones on track\n- 20% at risk\n- 20% complete\n- Critical Path: Apple animation (3 days at risk)\n\n**Team Capacity:**\n- Utilization: 87% (healthy)\n- Bandwidth for new work: Limited\n- Freelancer dependencies: 3 active\n\n**Key Concerns:**\n1. Nike budget trend needs reversal\n2. Apple schedule slip trending\n3. Coca-Cola scope expansion requires decision\n\n**Recommendation:** Schedule review meeting for Nike and Coca-Cola decisions within 2 days.`,
      sources: [
        { title: 'Studio Health Dashboard', url: '/dashboard' },
        { title: 'Active Projects Overview', url: '/projects' },
      ],
      suggestedQuestions: [
        'What can we do to improve Nike budget health?',
        'Should we proceed with the Coca-Cola scope expansion?',
        'How much team capacity do we have for new projects?',
      ],
    }
  }

  // Default helpful response
  return {
    response: `I can help you understand your projects, budgets, timelines, and team capacity. Here are some things you can ask me:\n\n- **Project Status**: "What's the status of all active projects?"\n- **Risk Assessment**: "Which projects are at risk this week?"\n- **Budget Deep Dives**: "How much have we spent on Nike?" or "What's our overall budget health?"\n- **Team & Capacity**: "How much team capacity do we have?"\n- **Client Relationships**: "How is the Samsung feedback process going?"\n- **Decisions**: "Should we approve the Coca-Cola scope expansion?"\n\nFeel free to ask about specific projects or metrics. I have access to your project data, budgets, timelines, and team information.`,
    sources: [],
    suggestedQuestions: [
      "What's the status of all active projects?",
      'Which projects are at risk this week?',
      'Summarize the latest feedback on Nike',
      "What's our overall studio health?",
    ],
  }
}
