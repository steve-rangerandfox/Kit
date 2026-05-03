'use client'

import { useSearchParams } from 'next/navigation'
import { OverviewTab } from './overview-tab'
import { BudgetTab } from './budget-tab'
import { ScheduleTab } from './schedule-tab'
import { FeedbackTab } from './feedback-tab'
import { CommsTab } from './comms-tab'
import { DeliverablesTab } from './deliverables-tab'
import { ContextTab } from './context-tab'
import { ToolkitTab } from './toolkit-tab'
import { TeamTab } from './team-tab'

// Mock project data - comprehensive for all tabs
const mockProject = {
  id: 'proj-1',
  name: 'Nike Summer Campaign',
  client_name: 'Nike Global',
  project_code: 'NIKE-SUM-2026',
  status: 'in_progress' as const,
  budget: 150000,
  spent: 87500,
  health: 'amber' as const,
  start_date: new Date('2026-02-01'),
  end_date: new Date('2026-05-30'),
  description: 'A comprehensive summer campaign featuring motion graphics, product cinematography, and social media assets for Nike Global\'s Q2 2026 launch initiative.',

  // Metrics for overview
  daysRemaining: 45,
  revisionsUsed: 4,
  revisionsTotal: 6,
  healthScore: 72,

  // Milestones
  milestones: [
    {
      id: 'ms-1',
      name: 'Creative Direction Lock',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'completed' as const,
      progress: 100,
    },
    {
      id: 'ms-2',
      name: 'Animatic Review',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'in_progress' as const,
      progress: 65,
    },
    {
      id: 'ms-3',
      name: 'Motion Graphics Production',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'pending' as const,
      progress: 0,
    },
    {
      id: 'ms-4',
      name: 'Color Grade & VFX',
      due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: 'pending' as const,
      progress: 0,
    },
    {
      id: 'ms-5',
      name: 'Final Delivery',
      due_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      status: 'pending' as const,
      progress: 0,
    },
  ],

  // Project brief
  brief: `Nike's Summer 2026 campaign aims to showcase athletic innovation through cinematic storytelling. The campaign targets Gen-Z athletes and fitness enthusiasts with an emphasis on sustainability and performance technology. Key deliverables include a 60-second hero film, 15-second social cuts, and product showcase videos.`,

  // Pending actions
  pending_actions: [
    {
      id: 'act-1',
      title: 'Review client feedback on animatic',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      priority: 'high' as const,
    },
    {
      id: 'act-2',
      title: 'Schedule color grade session',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: 'medium' as const,
    },
    {
      id: 'act-3',
      title: 'Finalize soundtrack selection',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'medium' as const,
    },
  ],

  // Recent feedback
  recent_feedback: [
    {
      id: 'fb-1',
      content: 'The opening shot feels a bit slow - consider tightening the pacing by 15%',
      source: 'Client (Sarah Chen)',
      sentiment: 'neutral' as const,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-2',
      content: 'Love the color palette! Very aligned with brand guidelines.',
      source: 'Internal (Creative Director)',
      sentiment: 'positive' as const,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-3',
      content: 'Need to adjust the music licensing for the international version',
      source: 'Client',
      sentiment: 'neutral' as const,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ],

  // Budget data
  burn_rate: [
    { week: 'Week 1', amount: 8500 },
    { week: 'Week 2', amount: 9200 },
    { week: 'Week 3', amount: 11000 },
    { week: 'Week 4', amount: 9800 },
    { week: 'Week 5', amount: 12500 },
    { week: 'Week 6', amount: 13800 },
    { week: 'Week 7', amount: 14200 },
    { week: 'Week 8', amount: 15000 },
  ],
  margin_target: 35000,
  margin_actual: 27500,

  // Time by member
  time_by_member: [
    { name: 'Alex Rivera', hours: 128, percentage: 35 },
    { name: 'Jordan Lee', hours: 96, percentage: 26 },
    { name: 'Casey Martinez', hours: 72, percentage: 20 },
    { name: 'Morgan Chen', hours: 48, percentage: 13 },
    { name: 'Taylor Brooks', hours: 32, percentage: 6 },
  ],

  // Time by category
  time_by_category: [
    { category: 'Production', hours: 156, percentage: 43 },
    { category: 'Review', hours: 92, percentage: 25 },
    { category: 'Revisions', hours: 72, percentage: 20 },
    { category: 'Admin', hours: 28, percentage: 8 },
    { category: 'Meetings', hours: 12, percentage: 3 },
  ],

  // Time entries
  time_entries: [
    {
      id: 'te-1',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      member: 'Alex Rivera',
      hours: 8,
      category: 'Production',
      description: 'Motion graphics for hero sequence',
    },
    {
      id: 'te-2',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      member: 'Jordan Lee',
      hours: 6,
      category: 'Review',
      description: 'Animatic review with client',
    },
    {
      id: 'te-3',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      member: 'Casey Martinez',
      hours: 4,
      category: 'Revisions',
      description: 'Timing adjustments on opening',
    },
    {
      id: 'te-4',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      member: 'Morgan Chen',
      hours: 5,
      category: 'Production',
      description: 'Asset optimization and export prep',
    },
  ],

  // Feedback items
  feedback_items: [
    {
      id: 'fb-item-1',
      content: 'The opening shot feels a bit slow - consider tightening the pacing by 15%',
      source: 'Client (Sarah Chen)',
      source_url: 'mailto:sarah@nike.com',
      sentiment: 'neutral' as const,
      priority: 'high' as const,
      status: 'new' as const,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-item-2',
      content: 'The product showcase needs more emphasis on the sustainability story',
      source: 'Client',
      source_url: 'https://nike-portal.example.com/feedback',
      sentiment: 'neutral' as const,
      priority: 'high' as const,
      status: 'in_progress' as const,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-item-3',
      content: 'Color grade looks amazing - really captures the brand energy!',
      source: 'Internal (Creative Director)',
      source_url: '',
      sentiment: 'positive' as const,
      priority: 'low' as const,
      status: 'resolved' as const,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ],

  // Communications
  call_actions: [
    {
      id: 'call-1',
      call_type: 'client_review',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      summary: 'Reviewed first animatic cut. Client requested pacing adjustments and more emphasis on sustainability messaging.',
      action_items: [
        'Tighten opening sequence by 15%',
        'Add sustainability callout in product showcase',
        'Schedule follow-up review for Thursday',
      ],
      draft_email: `Hi Sarah,

Thanks for the feedback on the animatic! We've captured your notes:

1. Tightening the opening sequence by 15% to increase pace
2. Adding more emphasis on the sustainability story in the product showcase
3. Adjusting music cues for better rhythm

We'll have revisions ready by Wednesday EOD. Let's schedule a quick call Thursday morning to review?

Best,
Team`,
    },
    {
      id: 'call-2',
      call_type: 'internal_standup',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      summary: 'Internal production standup. Discussed timeline risks and resource allocation.',
      action_items: [
        'Confirm color grade date with post house',
        'Begin VFX asset preparation',
        'Review final delivery specs',
      ],
      draft_email: `Team,

Quick recap from today's standup:

ACTION ITEMS:
- Alex: Confirm color grade slot with post house by EOW
- Jordan: Begin asset preparation for VFX pipeline
- Casey: Finalize delivery specs and create master export settings

We're on track for final delivery by end of May. Let's keep momentum!

Thanks,
Team`,
    },
  ],

  // Deliverables
  deliverables: [
    {
      id: 'del-1',
      title: 'Hero Film (60s)',
      status: 'in_progress' as const,
      format: 'video',
      delivery_url: 'https://vimeo.example.com/nike-hero-60s',
      specs: {
        duration: '60 seconds',
        dimensions: '1920x1080, 4K backup',
        framerate: '24fps',
        codec: 'ProRes 422 HQ',
      },
    },
    {
      id: 'del-2',
      title: 'Social Cut (15s)',
      status: 'not_started' as const,
      format: 'video',
      delivery_url: '',
      specs: {
        duration: '15 seconds',
        dimensions: '1080x1080 (Instagram), 1920x1080 (TikTok)',
        framerate: '24fps',
        codec: 'H.264',
      },
    },
    {
      id: 'del-3',
      title: 'Product Showcase (30s)',
      status: 'in_progress' as const,
      format: 'video',
      delivery_url: 'https://vimeo.example.com/nike-product-30s',
      specs: {
        duration: '30 seconds',
        dimensions: '1920x1080',
        framerate: '24fps',
        codec: 'ProRes 422 HQ',
      },
    },
    {
      id: 'del-4',
      title: 'Behind-the-Scenes Documentary',
      status: 'not_started' as const,
      format: 'video',
      delivery_url: '',
      specs: {
        duration: '3-5 minutes',
        dimensions: '1920x1080',
        framerate: '24fps',
        codec: 'ProRes 422 HQ',
      },
    },
  ],

  // Documents/Knowledge base
  documents: [
    {
      id: 'doc-1',
      title: 'Nike Brand Guidelines 2026',
      type: 'guideline',
      visibility: 'team',
      date: new Date('2026-02-01'),
    },
    {
      id: 'doc-2',
      title: 'Summer Campaign Brief',
      type: 'brief',
      visibility: 'founder',
      date: new Date('2026-02-05'),
    },
    {
      id: 'doc-3',
      title: 'Product Spec Sheet',
      type: 'reference',
      visibility: 'team',
      date: new Date('2026-02-10'),
    },
    {
      id: 'doc-4',
      title: 'Master Contract',
      type: 'contract',
      visibility: 'founder',
      date: new Date('2026-01-15'),
    },
  ],

  // Team members
  team_members: [
    {
      id: 'tm-1',
      name: 'Alex Rivera',
      role: 'Motion Designer',
      email: 'alex@studio.com',
      avatar: '🎨',
    },
    {
      id: 'tm-2',
      name: 'Jordan Lee',
      role: 'Producer',
      email: 'jordan@studio.com',
      avatar: '👤',
    },
    {
      id: 'tm-3',
      name: 'Casey Martinez',
      role: 'Editor',
      email: 'casey@studio.com',
      avatar: '✂️',
    },
    {
      id: 'tm-4',
      name: 'Morgan Chen',
      role: 'VFX Artist',
      email: 'morgan@studio.com',
      avatar: '✨',
    },
  ],
}

export default function ProjectDetailPage() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'

  const renderTab = () => {
    switch (tab) {
      case 'budget':
        return <BudgetTab project={mockProject} />
      case 'schedule':
        return <ScheduleTab project={mockProject} />
      case 'feedback':
        return <FeedbackTab project={mockProject} />
      case 'comms':
        return <CommsTab project={mockProject} />
      case 'deliverables':
        return <DeliverablesTab project={mockProject} />
      case 'context':
        return <ContextTab project={mockProject} />
      case 'toolkit':
        return <ToolkitTab />
      case 'team':
        return <TeamTab project={mockProject} />
      case 'overview':
      default:
        return <OverviewTab project={mockProject} />
    }
  }

  return <>{renderTab()}</>
}
