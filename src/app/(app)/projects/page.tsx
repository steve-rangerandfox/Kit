// @ts-nocheck
import { ProjectsTable } from './projects-table'
import { ProjectsHeader } from './projects-header'

const mockProjects = [
  { id: 'proj-1', name: 'Nike Summer Campaign', client_name: 'Nike Global', code: 'NIKE-2026-SUM', status: 'active' as const, budget: 150000, spent: 87500, due_date: '2026-04-25', health: 'amber' as const },
  { id: 'proj-2', name: 'Spotify Wrapped 2026', client_name: 'Spotify', code: 'SPOTIFY-WRAP', status: 'active' as const, budget: 200000, spent: 145000, due_date: '2026-04-18', health: 'emerald' as const },
  { id: 'proj-3', name: 'Netflix Title Sequence', client_name: 'Netflix', code: 'NETFLIX-TS', status: 'active' as const, budget: 180000, spent: 165000, due_date: '2026-04-13', health: 'coral' as const },
  { id: 'proj-4', name: 'Apple Product Launch', client_name: 'Apple', code: 'APPLE-PROD', status: 'draft' as const, budget: 220000, spent: 0, due_date: '2026-06-10', health: 'emerald' as const },
  { id: 'proj-5', name: 'Google Brand Film', client_name: 'Google', code: 'GOOGLE-BF', status: 'on_hold' as const, budget: 160000, spent: 128000, due_date: '2026-05-26', health: 'amber' as const },
  { id: 'proj-6', name: 'Meta Campaign', client_name: 'Meta', code: 'META-2026', status: 'wrapped' as const, budget: 135000, spent: 125000, due_date: '2026-04-04', health: 'emerald' as const },
  { id: 'proj-7', name: 'Adidas Animation', client_name: 'Adidas', code: 'ADIDAS-ANIM', status: 'active' as const, budget: 175000, spent: 92000, due_date: '2026-05-11', health: 'emerald' as const },
  { id: 'proj-8', name: 'Tesla Brand Refresh', client_name: 'Tesla', code: 'TESLA-BR', status: 'archived' as const, budget: 145000, spent: 145000, due_date: '2026-03-12', health: 'emerald' as const },
]

export default function ProjectsPage() {
  const existingClients = Array.from(new Set(mockProjects.map((p) => p.client_name))).sort()
  return (
    <div className="space-y-6">
      <ProjectsHeader existingClients={existingClients} projectCount={mockProjects.length} />
      <ProjectsTable projects={mockProjects} />
    </div>
  )
}
