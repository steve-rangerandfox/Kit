// @ts-nocheck
import { ActionsListClient } from './actions-list'

export default function ActionsPage() {
  const mockActions = [
    { id: 'a1', type: 'budget_alert', title: 'Nike Summer Campaign over budget', description: 'Project has exceeded 90% of budget with 3 weeks remaining. Spend: $135k of $150k.', priority: 'critical' as const, projectName: 'Nike Summer Campaign', projectId: 'proj_1', createdAt: new Date(Date.now() - 2*3600000).toISOString() },
    { id: 'a2', type: 'schedule_alert', title: 'Storyboard milestone overdue', description: 'Storyboard approval for Apple Product Launch was due 2 days ago.', priority: 'high' as const, projectName: 'Apple Product Launch', projectId: 'proj_2', createdAt: new Date(Date.now() - 5*3600000).toISOString() },
    { id: 'a3', type: 'feedback_triage', title: 'New client feedback on Netflix sequence', description: 'Client left 3 new feedback items. Sentiment analysis shows mixed signals.', priority: 'high' as const, projectName: 'Netflix Title Sequence', projectId: 'proj_3', createdAt: new Date(Date.now() - 8*3600000).toISOString() },
    { id: 'a4', type: 'scope_alert', title: 'Potential scope creep detected', description: 'Client mentioned additional scenes in review call. Estimated impact: +$12,000.', priority: 'high' as const, projectName: 'Spotify Wrapped 2026', projectId: 'proj_4', createdAt: new Date(Date.now() - 12*3600000).toISOString() },
    { id: 'a5', type: 'client_email', title: 'Draft status update for Samsung', description: 'Kit drafted a weekly status update email for the Samsung team.', priority: 'medium' as const, projectName: 'Samsung Galaxy Launch', projectId: 'proj_5', createdAt: new Date(Date.now() - 18*3600000).toISOString() },
    { id: 'a6', type: 'status_update', title: 'Weekly studio health report ready', description: '4 of 6 active projects are on track. Report ready for review.', priority: 'medium' as const, projectName: 'All Projects', projectId: '', createdAt: new Date(Date.now() - 24*3600000).toISOString() },
    { id: 'a7', type: 'schedule_alert', title: 'Final delivery in 3 days', description: 'Mercedes brand film final delivery due in 3 days. All deliverables in review.', priority: 'medium' as const, projectName: 'Mercedes Brand Film', projectId: 'proj_6', createdAt: new Date(Date.now() - 26*3600000).toISOString() },
    { id: 'a8', type: 'daily_briefing', title: 'Morning briefing ready', description: '2 milestones due this week, 1 budget alert.', priority: 'low' as const, projectName: 'All Projects', projectId: '', createdAt: new Date(Date.now() - 30*3600000).toISOString() },
    { id: 'a9', type: 'feedback_triage', title: 'Unresolved feedback aging', description: '4 feedback items on Adidas Originals unresolved for over 48 hours.', priority: 'medium' as const, projectName: 'Adidas Originals', projectId: 'proj_7', createdAt: new Date(Date.now() - 36*3600000).toISOString() },
    { id: 'a10', type: 'budget_alert', title: 'Coca-Cola approaching threshold', description: 'At 78% of budget with 40% of work remaining.', priority: 'low' as const, projectName: 'Coca-Cola Holiday', projectId: 'proj_8', createdAt: new Date(Date.now() - 48*3600000).toISOString() },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Actions</h1>
        <p className="text-sm text-[#9ca3af] mt-1">Review and approve Kit&apos;s suggestions</p>
      </div>
      <ActionsListClient actions={mockActions} />
    </div>
  )
}
