import { createClient } from '@/lib/supabase/server'
import { Greeting } from './greeting'
import { StatsStrip } from './stats-strip'
import { ProjectGrid } from './project-grid'

// Mock data for demo - remove when connecting to real database
const mockProjects = [
  {
    id: 'proj-1',
    name: 'Nike Summer Campaign',
    client_name: 'Nike Global',
    status: 'in_progress' as const,
    budget: 150000,
    spent: 87500,
    health: 'amber' as const,
    nextMilestone: {
      name: 'Final Color Grade',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    id: 'proj-2',
    name: 'Spotify Wrapped 2026',
    client_name: 'Spotify',
    status: 'in_progress' as const,
    budget: 200000,
    spent: 145000,
    health: 'emerald' as const,
    nextMilestone: {
      name: 'Motion Design Review',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  },
  {
    id: 'proj-3',
    name: 'Netflix Title Sequence',
    client_name: 'Netflix',
    status: 'in_progress' as const,
    budget: 180000,
    spent: 165000,
    health: 'coral' as const,
    nextMilestone: {
      name: 'VFX Integration',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  },
  {
    id: 'proj-4',
    name: 'Apple Product Launch',
    client_name: 'Apple',
    status: 'in_progress' as const,
    budget: 220000,
    spent: 92000,
    health: 'emerald' as const,
    nextMilestone: {
      name: '3D Asset Delivery',
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    },
  },
  {
    id: 'proj-5',
    name: 'Google Brand Film',
    client_name: 'Google',
    status: 'in_progress' as const,
    budget: 160000,
    spent: 128000,
    health: 'amber' as const,
    nextMilestone: {
      name: 'Sound Design',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user's team member info
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('name, email')
    .eq('user_id', user!.id)
    .single() as any

  // Get active projects - for now we'll use mock data
  // TODO: Replace with real database queries
  const activeProjects = mockProjects
  const pendingActionsCount = 5
  const thisWeeksHours = 28.5
  const studioHealthScore = 82

  const userFirstName = (teamMember?.name as string | undefined)?.split(' ')[0] || 'there'

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
        {/* Greeting */}
        <Greeting firstName={userFirstName} />

        {/* Stats Strip */}
        <StatsStrip
          activeProjects={activeProjects.length}
          pendingActions={pendingActionsCount}
          hoursThisWeek={thisWeeksHours}
          studioHealth={studioHealthScore}
        />

        {/* Projects Grid */}
        <ProjectGrid projects={activeProjects} />
      </div>
    </div>
  )
}
