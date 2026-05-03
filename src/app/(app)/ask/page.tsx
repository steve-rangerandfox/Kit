import { Chat } from './chat'

export const metadata = {
  title: 'Ask Kit — Kit',
  description: 'Ask anything about your projects',
}

const suggestedQuestions = [
  "What's the status of all active projects?",
  'Which projects are at risk this week?',
  'Summarize the latest feedback on Nike',
  "What's our overall studio health?",
]

export default function AskPage() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <Chat suggestedQuestions={suggestedQuestions} />
    </div>
  )
}
